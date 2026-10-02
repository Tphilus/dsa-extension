export type Platform = 'leetcode' | 'hackerrank' | 'codeforces'

export interface Submission {
  platform: Platform
  title: string
  difficulty: string
  language: string
  code: string
  url: string
  description?: string
  // Codeforces-only: contest id + problem index letter, used to name the
  // folder "158A-Next-Round" instead of a generic title slug.
  meta?: { contestId?: string; index?: string }
}

export interface Settings {
  token: string
  repo: string
  branch: string
}

export interface GithubUser {
  login: string
  avatarUrl: string
  expirationDate?: string
}

export interface RepoSummary {
  fullName: string
  defaultBranch: string
  private: boolean
}

export interface SubmissionRecord {
  id: string
  title: string
  platform: Platform
  difficulty: string
  language: string
  path: string | null
  docPath: string | null
  timestamp: number
  status: 'pushed' | 'failed'
  error?: string
}

export interface SubmissionMessage {
  type: 'SUBMISSION_CAPTURED'
  payload: Submission
  isManual?: boolean
}

export interface SubmissionResponse {
  ok: boolean
  result?: SubmissionRecord
  error?: string
}

export interface QueuedSubmission {
  id: string
  submission: Submission
  timestamp: number
  retryAfter?: number
}
