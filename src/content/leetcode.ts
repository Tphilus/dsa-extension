import { debounce, extractEditorCode, findElementByExactText, isExtensionContextValid, safeSendMessage } from '../utils/dom-utils'
import type { Submission, SubmissionResponse } from '../utils/types'

const KNOWN_LANGUAGES = [
  'C++', 'Java', 'Python', 'Python3', 'C', 'C#', 'JavaScript', 'TypeScript',
  'PHP', 'Swift', 'Kotlin', 'Dart', 'Go', 'Ruby', 'Scala', 'Rust', 'Racket',
  'Erlang', 'Elixir', 'MySQL', 'MS SQL Server', 'Oracle', 'Bash',
]

let lastProcessedKey: string | null = null
let currentPath = window.location.pathname

function getProblemSlug(): string | null {
  const match = window.location.pathname.match(/\/problems\/([^/]+)/)
  return match ? match[1] : null
}

function getTitle(slug: string): string {
  const titleEl = document.querySelector('[data-cy="question-title"], div.text-title-large')
  if (titleEl && titleEl.textContent?.trim()) return titleEl.textContent.trim()
  if (document.title) {
    const parts = document.title.split(' - ')
    if (parts.length > 1 && parts[0].trim()) return parts[0].trim()
  }
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function getDifficulty(): string {
  if (document.querySelector('.text-difficulty-easy')) return 'Easy'
  if (document.querySelector('.text-difficulty-medium')) return 'Medium'
  if (document.querySelector('.text-difficulty-hard')) return 'Hard'

  for (const level of ['Easy', 'Medium', 'Hard']) {
    if (findElementByExactText(document, level)) return level
  }
  return 'unknown'
}

function getLanguage(): string {
  const buttons = document.querySelectorAll('button, [role="button"]')
  for (const btn of buttons) {
    const text = btn.textContent?.trim() ?? ''
    if (KNOWN_LANGUAGES.includes(text)) return text
  }
  return 'txt'
}

function getResultContainer(): Element | null {
  return document.querySelector('[data-e2e-locator="submission-result"]')
}

function getDescription(): string | undefined {
  const descEl = document.querySelector('[data-track-load="description_content"], .content__u3I1')
  return descEl?.innerHTML?.trim() || undefined
}

function handleAccepted(isManual: boolean = false): void {
  const slug = getProblemSlug()
  if (!slug || (!isManual && lastProcessedKey === slug)) return

  const code = extractEditorCode(document)
  if (!code || code.trim().length === 0) {
    if (isManual) alert('AutoPush: Could not extract code. The platform UI may have changed. Please open an issue on GitHub.')
    else console.error('[DSA AutoPush] Accepted detected, but code extraction failed.')
    return
  }

  if (!isManual) lastProcessedKey = slug

  const payload: Submission = {
    platform: 'leetcode',
    title: getTitle(slug),
    difficulty: getDifficulty(),
    language: getLanguage(),
    code,
    url: window.location.href.split('?')[0],
    description: getDescription(),
  }

  safeSendMessage<unknown, SubmissionResponse>(
    { type: 'SUBMISSION_CAPTURED', payload, isManual },
    (response) => {
      if (!response?.ok) console.warn('[DSA AutoPush] Failed to push submission:', response?.error)
    },
    teardown,
  )

  setTimeout(() => {
    if (lastProcessedKey === slug) lastProcessedKey = null
  }, 15000)
}

function injectManualSyncButton(resultEl: Element) {
  if (document.getElementById('dsa-autopush-sync-btn')) return

  const container = resultEl.parentElement?.parentElement
  if (!container) return

  const btn = document.createElement('button')
  btn.id = 'dsa-autopush-sync-btn'
  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
    Sync w/ AutoPush
  `
  btn.style.cssText = `
    display: inline-flex; align-items: center; justify-content: center;
    background-color: #f59e0b; color: white; border: none; border-radius: 6px;
    padding: 6px 12px; font-size: 13px; font-weight: 600; cursor: pointer;
    margin-left: 12px; transition: background-color 0.2s; font-family: inherit;
    line-height: 1;
  `
  btn.onmouseover = () => (btn.style.backgroundColor = '#d97706')
  btn.onmouseout = () => (btn.style.backgroundColor = '#f59e0b')

  btn.onclick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const originalText = btn.innerHTML
    btn.innerHTML = 'Syncing...'
    btn.style.opacity = '0.7'
    handleAccepted(true)
    setTimeout(() => {
      btn.innerHTML = originalText
      btn.style.opacity = '1'
    }, 2000)
  }

  container.appendChild(btn)
}

let hasJustSubmitted = false

document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement
  if (target.closest('[data-e2e-locator="console-submit-button"]')) {
    hasJustSubmitted = true
  }
})

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    hasJustSubmitted = true
  }
})

let navigationIntervalId: ReturnType<typeof setInterval> | undefined

// Stops all observers/timers once the extension context is invalidated
// (e.g. reloaded during development), so this orphaned script goes quiet
// instead of throwing "Extension context invalidated" on every tick.
function teardown(): void {
  observer.disconnect()
  if (navigationIntervalId !== undefined) clearInterval(navigationIntervalId)
}

const checkForVerdict = debounce(() => {
  if (!isExtensionContextValid()) {
    teardown()
    return
  }
  const resultEl = getResultContainer()
  if (resultEl && resultEl.textContent?.trim() === 'Accepted') {
    if (hasJustSubmitted) {
      handleAccepted()
      hasJustSubmitted = false
    }
    injectManualSyncButton(resultEl)
  }
}, 400)

const observer = new MutationObserver(checkForVerdict)
observer.observe(document.body, { childList: true, subtree: true, characterData: true })

// LeetCode is a single-page app; reset the dedupe guard on client-side navigation.
navigationIntervalId = setInterval(() => {
  if (!isExtensionContextValid()) {
    teardown()
    return
  }
  if (window.location.pathname !== currentPath) {
    currentPath = window.location.pathname
    lastProcessedKey = null
  }
}, 1000)
