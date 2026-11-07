import { debounce, extractEditorCode, findElementByExactText, isExtensionContextValid, safeSendMessage } from '../utils/dom-utils'
import type { Submission, SubmissionResponse } from '../utils/types'

const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Basic', 'Intermediate', 'Advanced', 'Expert']

// HackerRank never prints "Accepted". A full submission that passes every test
// shows "Congratulations — You solved this challenge". "Run Code" only says
// "You have passed the sample test cases", which must NOT trigger a push.
const SOLVED_PHRASES = ['you solved this challenge', 'you have successfully solved this challenge']

let solvedVisible = false
let pushing = false

function getSlugFromPath(): string | null {
  const match = window.location.pathname.match(/challenges\/([^/]+)/)
  return match ? match[1] : null
}

function getTitle(slug: string | null): string {
  const titleEl = document.querySelector('.challenge-page-title, h1.page-label, .page-label, [class*="challenge-title"]')
  if (titleEl && titleEl.textContent?.trim()) return titleEl.textContent.trim()
  const fromDocTitle = document.title.split('|')[0].trim()
  if (fromDocTitle && !/hackerrank/i.test(fromDocTitle)) return fromDocTitle
  return (slug || 'untitled').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function getDifficulty(): string {
  for (const level of DIFFICULTIES) {
    if (findElementByExactText(document, level, '[class*="difficulty"], [class*="Difficulty"]')) return level
  }
  for (const level of DIFFICULTIES) {
    if (findElementByExactText(document, level, 'span, p, div')) return level
  }
  return 'unknown'
}

function getLanguageFromDom(): string {
  const select = document.querySelector<HTMLSelectElement>('select[id*="language"], select[name*="language"]')
  if (select && select.selectedIndex >= 0) {
    const option = select.options[select.selectedIndex]
    if (option?.textContent?.trim()) return option.textContent.trim()
  }
  const dropdown = document.querySelector(
    '[class*="select-language"] [class*="singleValue"], [class*="select-language"] [class*="single-value"], ' +
      '[class*="language-selector"] [class*="selected"], [class*="language-picker"] button, button[class*="language"]',
  )
  if (dropdown?.textContent?.trim()) return dropdown.textContent.trim()
  const monaco = document.querySelector('.monaco-editor[data-mode-id]')
  return monaco?.getAttribute('data-mode-id') || 'txt'
}

function isSolved(): boolean {
  const text = (document.body.textContent || '').toLowerCase()
  return SOLVED_PHRASES.some((p) => text.includes(p))
}

function getDescription(): string | undefined {
  const descEl = document.querySelector('.challenge-body-html, .challenge_problem_statement, .problem-statement')
  return descEl?.innerHTML?.trim() || undefined
}

// Asks the MAIN-world helper (hackerrank-main.ts) for the full Monaco buffer.
function readEditorFromPage(): Promise<{ code: string; language: string } | null> {
  return new Promise((resolve) => {
    const id = Math.random().toString(36).slice(2)
    const timer = setTimeout(() => {
      window.removeEventListener('message', onMessage)
      resolve(null)
    }, 500)
    function onMessage(event: MessageEvent) {
      const data = event.data as { source?: string; type?: string; id?: string; result?: { code: string; language: string } | null }
      if (event.source !== window || data?.source !== 'dsa-autopush' || data.type !== 'EDITOR_CODE' || data.id !== id) return
      clearTimeout(timer)
      window.removeEventListener('message', onMessage)
      resolve(data.result ?? null)
    }
    window.addEventListener('message', onMessage)
    window.postMessage({ source: 'dsa-autopush', type: 'GET_EDITOR_CODE', id }, '*')
  })
}

async function handleSolved(): Promise<void> {
  const slug = getSlugFromPath()
  if (!slug || pushing) return
  pushing = true
  try {
    const fromPage = await readEditorFromPage()
    const code = fromPage?.code?.trim() ? fromPage.code : extractEditorCode(document)
    if (!code || code.trim().length === 0) {
      console.error('[DSA AutoPush] HackerRank solve detected, but code extraction failed. The platform UI may have changed.')
      return
    }

    const payload: Submission = {
      platform: 'hackerrank',
      title: getTitle(slug),
      difficulty: getDifficulty(),
      language: fromPage?.language || getLanguageFromDom(),
      code,
      url: `${window.location.origin}${window.location.pathname.replace(/\/(problem|submissions).*$/, '')}/problem`,
      description: getDescription(),
    }

    console.info('[DSA AutoPush] HackerRank challenge solved, pushing:', payload.title)
    safeSendMessage<unknown, SubmissionResponse>(
      { type: 'SUBMISSION_CAPTURED', payload },
      (response) => {
        if (!response?.ok) console.warn('[DSA AutoPush] Failed to push submission:', response?.error)
      },
      teardown,
    )
  } finally {
    pushing = false
  }
}

let navigationIntervalId: ReturnType<typeof setInterval> | undefined
let currentPath = window.location.pathname

function teardown(): void {
  observer.disconnect()
  if (navigationIntervalId !== undefined) clearInterval(navigationIntervalId)
}

// Push once each time the "solved" banner appears (false -> true). The banner
// stays in the DOM, so firing on every mutation would push repeatedly.
const checkForVerdict = debounce(() => {
  if (!isExtensionContextValid()) {
    teardown()
    return
  }
  const solved = isSolved()
  if (solved && !solvedVisible) void handleSolved()
  solvedVisible = solved
}, 500)

const observer = new MutationObserver(checkForVerdict)
observer.observe(document.body, { childList: true, subtree: true, characterData: true })

// Don't treat a banner that was already on screen at load as a fresh solve.
solvedVisible = isSolved()

navigationIntervalId = setInterval(() => {
  if (!isExtensionContextValid()) {
    teardown()
    return
  }
  if (window.location.pathname !== currentPath) {
    currentPath = window.location.pathname
    solvedVisible = isSolved()
  }
}, 1000)
