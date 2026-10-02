import { getSettings, addSubmissionRecord } from '../utils/storage'
import { upsertFile, parseRepo } from '../utils/github'
import { slugify, extensionFor, fenceLanguageFor, titleHyphenate } from '../utils/constants'
import { estimateComplexity } from '../utils/complexity'
import type { Submission, SubmissionMessage, SubmissionResponse, SubmissionRecord, Platform } from '../utils/types'

const PLATFORM_LABELS: Record<Platform, string> = {
  leetcode: 'LeetCode',
  hackerrank: 'HackerRank',
  codeforces: 'Codeforces',
}

type DifficultyBucket = 'Easy' | 'Medium' | 'Hard'

type AuthResponse = { ok: true } | { ok: false; error: string }

chrome.runtime.onMessage.addListener(
  (
    message: SubmissionMessage | { type: 'START_GITHUB_AUTH' },
    _sender,
    sendResponse: (response: SubmissionResponse | AuthResponse) => void,
  ) => {
    if (message?.type === 'START_GITHUB_AUTH') {
      sendResponse({ ok: false, error: 'OAuth flow removed, please use a Personal Access Token in the popup' })
      return true
    }

    if (message?.type !== 'SUBMISSION_CAPTURED') return false

    handleSubmission(message.payload, message.isManual)
      .then((result) => sendResponse({ ok: true, result }))
      .catch(async (error: Error) => {
        if (error.message === 'Duplicate submission ignored to prevent double-pushing.') {
          sendResponse({ ok: true, result: undefined })
          return
        }
        await recordFailure(message.payload, error.message)
        await notify('Push failed', `${message.payload?.title || 'Submission'}: ${error.message}`, true)
        sendResponse({ ok: false, error: error.message })
      })

    return true // keep the message channel open for the async response
  },
)

// Codeforces buckets by numeric rating (<1200 Easy, 1200-1900 Medium, >=2000 Hard,
// per spec); the two small gaps the spec leaves open (1101-1199, 1901-1999) are
// filled the only way that keeps all three explicit boundaries true and leaves
// no gap: <1200 / <2000 / else.
function mapDifficultyBucket(submission: Submission): DifficultyBucket {
  if (submission.platform === 'codeforces') {
    const rating = Number(submission.difficulty)
    if (!Number.isNaN(rating)) {
      if (rating <= 1100) return 'Easy'
      if (rating <= 1900) return 'Medium'
      return 'Hard'
    }
    return 'Medium' // unrated fallback
  }
  const normalized = (submission.difficulty || '').toLowerCase()
  if (normalized === 'easy' || normalized === 'basic') return 'Easy'
  if (normalized === 'hard' || normalized === 'advanced' || normalized === 'expert') return 'Hard'
  return 'Medium' // covers 'medium' and unrecognized values
}

function formatDifficultyLabel(submission: Submission, bucket: DifficultyBucket): string {
  if (submission.platform === 'codeforces') {
    const rating = Number(submission.difficulty)
    return Number.isNaN(rating) ? `${bucket} (unrated)` : `${bucket} (rating ${rating})`
  }
  return bucket
}

// LeetCode/HackerRank: "two-sum". Codeforces: "158A-Next-Round" (contest id +
// problem index letter + title, since Codeforces has no text slug of its own).
function buildFolderName(submission: Submission): string {
  if (submission.platform === 'codeforces' && submission.meta?.contestId && submission.meta?.index) {
    return `${submission.meta.contestId}${submission.meta.index}-${titleHyphenate(submission.title)}`
  }
  return slugify(submission.title)
}

const processingCache = new Map<string, number>()

async function handleSubmission(submission: Submission, isManual = false): Promise<SubmissionRecord> {
  const settings = await getSettings()
  if (!settings.token || !settings.repo) {
    throw new Error('GitHub token or repository is not configured. Open the extension popup to set it up.')
  }

  const folderName = buildFolderName(submission)
  const cacheKey = `${submission.platform}-${folderName}`
  const now = Date.now()
  const lastProcessed = processingCache.get(cacheKey)
  
  if (!isManual && lastProcessed && (now - lastProcessed < 30000)) {
    throw new Error('Duplicate submission ignored to prevent double-pushing.')
  }
  processingCache.set(cacheKey, now)

  const { owner, repo } = parseRepo(settings.repo)
  const branch = settings.branch
  const bucket = mapDifficultyBucket(submission)
  const difficultyLabel = formatDifficultyLabel(submission, bucket)
  const ext = extensionFor(submission.language)
  const basePath = `${submission.platform}/${bucket}/${folderName}`
  const codePath = `${basePath}/solution.${ext}`
  const readmePath = `${basePath}/README.md`

  await upsertFile({
    owner,
    repo,
    branch,
    token: settings.token,
    path: codePath,
    content: submission.code,
    message: `Add/update solution: ${submission.title} (${PLATFORM_LABELS[submission.platform]})`,
  })

  const estimate = estimateComplexity(submission.code, submission.language)
  await upsertFile({
    owner,
    repo,
    branch,
    token: settings.token,
    path: readmePath,
    content: buildReadme(submission, difficultyLabel, estimate),
    message: `Add documentation: ${submission.title} (${PLATFORM_LABELS[submission.platform]})`,
  })

  const record: SubmissionRecord = {
    id: `${submission.platform}-${folderName}-${Date.now()}`,
    title: submission.title,
    platform: submission.platform,
    difficulty: difficultyLabel,
    language: submission.language,
    path: codePath,
    docPath: readmePath,
    timestamp: Date.now(),
    status: 'pushed',
  }
  await addSubmissionRecord(record)
  await notify('Pushed to GitHub', `${submission.title} (${PLATFORM_LABELS[submission.platform]})`, false)
  return record
}

async function recordFailure(submission: Submission, errorMessage: string): Promise<void> {
  if (!submission) return
  await addSubmissionRecord({
    id: `${submission.platform}-${slugify(submission.title)}-${Date.now()}`,
    title: submission.title,
    platform: submission.platform,
    difficulty: submission.difficulty,
    language: submission.language,
    path: null,
    docPath: null,
    timestamp: Date.now(),
    status: 'failed',
    error: errorMessage,
  })
}

function buildReadme(
  submission: Submission,
  difficultyLabel: string,
  estimate: ReturnType<typeof estimateComplexity>,
): string {
  const dateStr = new Date().toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short'
  })

  const lines = [
    `<h2><a href="${submission.url || '#'}">${submission.title}</a></h2>`,
    '',
    `**Language:** ${submission.language || 'N/A'} &nbsp;&nbsp;|&nbsp;&nbsp; ` +
    `**Difficulty:** ${difficultyLabel} &nbsp;&nbsp;|&nbsp;&nbsp; ` +
    `**Platform:** ${PLATFORM_LABELS[submission.platform]} &nbsp;&nbsp;|&nbsp;&nbsp; ` +
    `**Submitted:** ${dateStr}`,
    '',
    `---`,
    '',
    `### 📝 Problem Statement`,
    '',
  ]

  if (submission.description) {
    // HTML is injected directly so that platforms' native formatting (tables, lists, bold text) is perfectly preserved on GitHub.
    lines.push(`<div>`, submission.description, `</div>`, '')
  } else {
    lines.push(`_No description available for this problem._`, '')
  }

  lines.push(
    `---`,
    '',
    `### 💡 Solution`,
    '',
    '```' + fenceLanguageFor(submission.language),
    submission.code,
    '```',
    '',
    `---`,
    '',
    `### 📊 Complexity`,
    '',
    `- **Time:** ${estimate.time}`,
    `- **Space:** ${estimate.space}`,
    '',
    `> _Estimated from a static scan of loop nesting and allocation patterns, not true algorithmic analysis._`
  )
  return lines.join('\n')
}

async function notify(title: string, message: string, isError: boolean): Promise<void> {
  if (!chrome.notifications) return
  try {
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title,
      message,
      priority: isError ? 2 : 0,
    })
  } catch {
    // Notifications are best-effort; ignore if unavailable (e.g. missing OS permission).
  }
}
