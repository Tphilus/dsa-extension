import { STORAGE_KEYS, DEFAULT_BRANCH, MAX_RECENT_SUBMISSIONS } from './constants'
import type { Settings, SubmissionRecord } from './types'

// Settings live in chrome.storage.sync (small, syncs across the user's browsers).
export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.sync.get({
    [STORAGE_KEYS.GITHUB_TOKEN]: '',
    [STORAGE_KEYS.REPO]: '',
    [STORAGE_KEYS.BRANCH]: DEFAULT_BRANCH,
  })
  return {
    token: result[STORAGE_KEYS.GITHUB_TOKEN],
    repo: result[STORAGE_KEYS.REPO],
    branch: result[STORAGE_KEYS.BRANCH] || DEFAULT_BRANCH,
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.sync.set({
    [STORAGE_KEYS.GITHUB_TOKEN]: settings.token || '',
    [STORAGE_KEYS.REPO]: settings.repo || '',
    [STORAGE_KEYS.BRANCH]: settings.branch || DEFAULT_BRANCH,
  })
}

export async function saveToken(token: string): Promise<void> {
  await chrome.storage.sync.set({ [STORAGE_KEYS.GITHUB_TOKEN]: token })
}

// Submission history can include source code, so it goes in chrome.storage.local
// to avoid chrome.storage.sync's small per-item/total quota.
export async function getRecentSubmissions(): Promise<SubmissionRecord[]> {
  const result = await chrome.storage.local.get({ [STORAGE_KEYS.SUBMISSIONS]: [] })
  return result[STORAGE_KEYS.SUBMISSIONS] as SubmissionRecord[]
}

export async function addSubmissionRecord(record: SubmissionRecord): Promise<SubmissionRecord[]> {
  const existing = await getRecentSubmissions()
  const next = [record, ...existing].slice(0, MAX_RECENT_SUBMISSIONS)
  await chrome.storage.local.set({ [STORAGE_KEYS.SUBMISSIONS]: next })
  return next
}

export function onStorageChanged(
  callback: (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => void,
): () => void {
  chrome.storage.onChanged.addListener(callback)
  return () => chrome.storage.onChanged.removeListener(callback)
}
