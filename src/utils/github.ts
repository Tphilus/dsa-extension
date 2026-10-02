import type { GithubUser, RepoSummary } from './types'

const API_BASE = 'https://api.github.com'

interface RepoRef {
  owner: string
  repo: string
}

interface FileArgs {
  owner: string
  repo: string
  branch: string
  token: string
  path: string
}

interface UpsertFileArgs extends FileArgs {
  content: string
  message: string
}

interface VerifyAccessArgs {
  token: string
  repo: string
  branch: string
}

export class RateLimitError extends Error {
  reset?: number
  constructor(message: string, reset?: number) {
    super(message)
    this.name = 'RateLimitError'
    this.reset = reset
  }
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

async function safeText(response: Response): Promise<string> {
  try {
    const data = await response.json()
    return data.message || JSON.stringify(data)
  } catch {
    return response.statusText
  }
}

async function githubFetch(url: string, options: RequestInit & { token: string }): Promise<Response> {
  const { token, ...fetchOptions } = options
  const response = await fetch(url, {
    ...fetchOptions,
    headers: { ...authHeaders(token), ...fetchOptions.headers },
  })
  
  if (!response.ok) {
    if (response.status === 403 || response.status === 429) {
      const reset = response.headers.get('x-ratelimit-reset')
      const retryAfter = response.headers.get('retry-after')
      if (reset || retryAfter) {
        const resetTs = reset ? parseInt(reset, 10) * 1000 : Date.now() + parseInt(retryAfter || '60', 10) * 1000
        throw new RateLimitError('GitHub API rate limit exceeded. Please try again later.', resetTs)
      }
    }
    const errorMsg = await safeText(response)
    throw new Error(`GitHub API Error (${response.status}): ${errorMsg}`)
  }
  return response
}

function parseNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null
  for (const part of linkHeader.split(',')) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/)
    if (match) return match[1]
  }
  return null
}

async function paginate<T>(url: string, token: string): Promise<T[]> {
  const results: T[] = []
  let currentUrl: string | null = url

  while (currentUrl) {
    const response = await githubFetch(currentUrl, { method: 'GET', token })
    const data = await response.json()
    results.push(...data)
    currentUrl = parseNextLink(response.headers.get('Link'))
  }

  return results
}

export function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  const CHUNK_SIZE = 0x8000
  const chunks: string[] = []
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    chunks.push(String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK_SIZE))))
  }
  return btoa(chunks.join(''))
}

export function parseRepo(repoInput: string): RepoRef {
  const trimmed = (repoInput || '')
    .trim()
    .replace(/^https?:\/\/github\.com\//, '')
    .replace(/\.git$/, '')
    .replace(/^\/|\/$/g, '')
  const [owner, repo] = trimmed.split('/')
  if (!owner || !repo) {
    throw new Error('Repository must be in the form "owner/repo"')
  }
  return { owner, repo }
}

async function getFileSha({ owner, repo, path, branch, token }: FileArgs): Promise<string | null> {
  const url = `${API_BASE}/repos/${owner}/${repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(branch)}`
  const response = await fetch(url, { headers: authHeaders(token) }) // intentionally manual to cleanly handle 404
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Failed to check existing file: ${await safeText(response)}`)
  const data = await response.json()
  return data.sha || null
}

export async function upsertFile({ owner, repo, branch, token, path, content, message }: UpsertFileArgs) {
  const sha = await getFileSha({ owner, repo, path, branch, token })
  const url = `${API_BASE}/repos/${owner}/${repo}/contents/${encodeURI(path)}`
  const body = {
    message,
    content: utf8ToBase64(content),
    branch,
    ...(sha ? { sha } : {}),
  }
  const response = await githubFetch(url, {
    method: 'PUT',
    token,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return response.json()
}

export async function verifyAccess({ token, repo, branch }: VerifyAccessArgs): Promise<true> {
  const { owner, repo: name } = parseRepo(repo)
  await githubFetch(`${API_BASE}/repos/${owner}/${name}/branches/${encodeURIComponent(branch || 'main')}`, { token })
  return true
}

export async function getAuthenticatedUser(token: string): Promise<GithubUser> {
  const response = await githubFetch(`${API_BASE}/user`, { token })
  const expiration = response.headers.get('github-authentication-token-expiration')
  const data = await response.json()
  return { 
    login: data.login, 
    avatarUrl: data.avatar_url,
    ...(expiration ? { expirationDate: expiration } : {})
  }
}

export async function listUserRepos(token: string): Promise<RepoSummary[]> {
  const url = `${API_BASE}/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member`
  const rawRepos = await paginate<any>(url, token)
  return rawRepos.map(repo => ({
    fullName: repo.full_name,
    defaultBranch: repo.default_branch,
    private: repo.private
  }))
}

export async function createRepo(
  token: string,
  name: string,
  isPrivate: boolean,
): Promise<RepoSummary> {
  const response = await githubFetch(`${API_BASE}/user/repos`, {
    method: 'POST',
    token,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, private: isPrivate, auto_init: true }),
  })
  const data = await response.json()
  return { fullName: data.full_name, defaultBranch: data.default_branch, private: data.private }
}

export async function listBranches(token: string, owner: string, repo: string): Promise<string[]> {
  const url = `${API_BASE}/repos/${owner}/${repo}/branches?per_page=100`
  const rawBranches = await paginate<{name: string}>(url, token)
  return rawBranches.map(b => b.name)
}
