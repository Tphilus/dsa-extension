import { debounce, extractEditorCode, findElementByExactText, isExtensionContextValid, safeSendMessage } from '../utils/dom-utils'
import type { Submission, SubmissionResponse } from '../utils/types'

const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Basic', 'Advanced', 'Expert']

let lastProcessedKey: string | null = null
let currentPath = window.location.pathname

function getSlugFromPath(): string | null {
  const match = window.location.pathname.match(/challenges\/([^/]+)/)
  return match ? match[1] : null
}

function getTitle(slug: string | null): string {
  const titleEl = document.querySelector('.challenge-page-title, [class*="challenge-title"], h1')
  if (titleEl && titleEl.textContent?.trim()) return titleEl.textContent.trim()
  return (slug || 'untitled').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function getDifficulty(): string {
  for (const level of DIFFICULTIES) {
    const el = findElementByExactText(document, level, '[class*="difficulty"], [class*="Difficulty"], span, div')
    if (el) return level
  }
  return 'unknown'
}

function getLanguage(): string {
  const select = document.querySelector<HTMLSelectElement>('select[id*="language"], select[name*="language"]')
  if (select && select.selectedIndex >= 0) {
    const option = select.options[select.selectedIndex]
    if (option) return option.textContent?.trim() ?? 'txt'
  }
  const dropdownBtn = document.querySelector(
    '[class*="language-selector"] [class*="selected"], [class*="language-picker"] button, button[class*="language"]',
  )
  if (dropdownBtn && dropdownBtn.textContent?.trim()) return dropdownBtn.textContent.trim()
  return 'txt'
}

function isAccepted(): boolean {
  return Boolean(
    findElementByExactText(document, 'Accepted', '[class*="result"], [class*="status"], [class*="verdict"], span, div'),
  )
}

function getDescription(): string | undefined {
  const descEl = document.querySelector('.challenge-body-html')
  return descEl?.innerHTML?.trim() || undefined
}

function handleAccepted(): void {
  const slug = getSlugFromPath()
  if (!slug || lastProcessedKey === slug) return

  const code = extractEditorCode(document)
  if (!code || code.trim().length === 0) {
    console.error('[DSA AutoPush] Accepted detected, but code extraction failed. The platform UI may have changed.')
    return
  }

  lastProcessedKey = slug

  const payload: Submission = {
    platform: 'hackerrank',
    title: getTitle(slug),
    difficulty: getDifficulty(),
    language: getLanguage(),
    code,
    url: window.location.href.split('?')[0],
    description: getDescription(),
  }

  safeSendMessage<unknown, SubmissionResponse>(
    { type: 'SUBMISSION_CAPTURED', payload },
    (response) => {
      if (!response?.ok) console.warn('[DSA AutoPush] Failed to push submission:', response?.error)
    },
    teardown,
  )

  setTimeout(() => {
    if (lastProcessedKey === slug) lastProcessedKey = null
  }, 15000)
}

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
  if (isAccepted()) handleAccepted()
}, 500)

const observer = new MutationObserver(checkForVerdict)
observer.observe(document.body, { childList: true, subtree: true, characterData: true })

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
