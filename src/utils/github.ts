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

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

export function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary)
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
  const response = await fetch(url, { headers: authHeaders(token) })
  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error(`Failed to check existing file (${response.status}): ${await safeText(response)}`)
  }
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
  const response = await fetch(url, {
    method: 'PUT',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new Error(`GitHub push failed (${response.status}): ${await safeText(response)}`)
  }
  return response.json()
}

export async function verifyAccess({ token, repo, branch }: VerifyAccessArgs): Promise<true> {
  const { owner, repo: name } = parseRepo(repo)
  const response = await fetch(
    `${API_BASE}/repos/${owner}/${name}/branches/${encodeURIComponent(branch || 'main')}`,
    { headers: authHeaders(token) },
  )
  if (!response.ok) {
    throw new Error(`Could not verify repo/branch (${response.status}): ${await safeText(response)}`)
  }
  return true
}

async function safeText(response: Response): Promise<string> {
  try {
    const data = await response.json()
    return data.message || JSON.stringify(data)
  } catch {
    return response.statusText
  }
}

export async function getAuthenticatedUser(token: string): Promise<GithubUser> {
  const response = await fetch(`${API_BASE}/user`, { headers: authHeaders(token) })
  if (!response.ok) {
    throw new Error(`Failed to fetch GitHub user (${response.status}): ${await safeText(response)}`)
  }
  const data = await response.json()
  return { login: data.login, avatarUrl: data.avatar_url }
}

// Walks the Link header to page through every repo the user can see, not just
// the first 100 (GitHub's max per_page).
export async function listUserRepos(token: string): Promise<RepoSummary[]> {
  const repos: RepoSummary[] = []
  let url: string | null =
    `${API_BASE}/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member`

  while (url) {
    const response: Response = await fetch(url, { headers: authHeaders(token) })
    if (!response.ok) {
      throw new Error(`Failed to list repositories (${response.status}): ${await safeText(response)}`)
    }
    const data = await response.json()
    for (const repo of data) {
      repos.push({ fullName: repo.full_name, defaultBranch: repo.default_branch, private: repo.private })
    }
    url = parseNextLink(response.headers.get('Link'))
  }

  return repos
}

export async function createRepo(
  token: string,
  name: string,
  isPrivate: boolean,
): Promise<RepoSummary> {
  const response = await fetch(`${API_BASE}/user/repos`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, private: isPrivate, auto_init: true }),
  })
  if (!response.ok) {
    throw new Error(`Failed to create repository (${response.status}): ${await safeText(response)}`)
  }
  const data = await response.json()
  return { fullName: data.full_name, defaultBranch: data.default_branch, private: data.private }
}

export async function listBranches(token: string, owner: string, repo: string): Promise<string[]> {
  const response = await fetch(`${API_BASE}/repos/${owner}/${repo}/branches?per_page=100`, {
    headers: authHeaders(token),
  })
  if (!response.ok) {
    throw new Error(`Failed to list branches (${response.status}): ${await safeText(response)}`)
  }
  const data = await response.json()
  return data.map((b: { name: string }) => b.name)
}

function parseNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null
  for (const part of linkHeader.split(',')) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/)
    if (match) return match[1]
  }
  return null
}
