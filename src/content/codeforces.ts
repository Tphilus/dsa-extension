import { debounce } from '../utils/dom-utils'
import type { Submission, SubmissionResponse } from '../utils/types'

// Rather than caching the submit form (fragile — relies on the user staying on
// the same tab), this watches the status table for Accepted rows and fetches
// the source directly from Codeforces' own submission-view page, which renders
// it in #program-source-text. Same-origin fetch from a content script carries
// the user's existing session cookies automatically.
const LANGUAGE_PREFIXES =
  /^(GNU\s?C|GNU\s?C\+\+|MS\s?C\+\+|Clang\+\+|Java|Kotlin|Python|PyPy|Mono\s?C#|\.NET|Rust|Go|D\b|Ocaml|Delphi|PascalABC|Perl|Ruby|Node\.js|Haskell|Scala)/i

interface AcceptedRowInfo {
  submissionId: string
  contestId: string
  index: string
}

interface AcceptedRowData {
  row: Element
  info: AcceptedRowInfo
}

function findAcceptedRows(): AcceptedRowData[] {
  const rows = document.querySelectorAll('tr[data-submission-id]')
  const results: AcceptedRowData[] = []
  for (const row of rows) {
    const verdictEl = row.querySelector('.verdict-accepted')
    if (!verdictEl) continue
    const submissionId = row.getAttribute('data-submission-id')
    if (!submissionId) continue
    const problemLink = row.querySelector<HTMLAnchorElement>('a[href*="/problem/"]')
    const href = problemLink?.getAttribute('href') ?? ''
    const match = href.match(/\/(?:contest|problemset\/problem)\/(\d+)\/(?:problem\/)?([A-Za-z0-9]+)/)
    if (!match) continue
    results.push({ row, info: { submissionId, contestId: match[1], index: match[2] } })
  }
  return results
}

async function fetchSubmissionSource(
  contestId: string,
  submissionId: string,
): Promise<{ code: string; language: string } | null> {
  const response = await fetch(`https://codeforces.com/contest/${contestId}/submission/${submissionId}`, {
    credentials: 'include',
  })
  if (!response.ok) return null
  const doc = new DOMParser().parseFromString(await response.text(), 'text/html')
  const pre = doc.querySelector('#program-source-text')
  if (!pre) return null
  const code = pre.textContent ?? ''

  const langCell = Array.from(doc.querySelectorAll('td')).find((td) => LANGUAGE_PREFIXES.test(td.textContent?.trim() ?? ''))
  const language = langCell?.textContent?.trim() || 'txt'

  return { code, language }
}

async function fetchProblemInfo(contestId: string, index: string): Promise<{ title: string; rating: number | null; description?: string }> {
  const response = await fetch(`https://codeforces.com/contest/${contestId}/problem/${index}`, {
    credentials: 'include',
  })
  if (!response.ok) return { title: `${contestId}${index}`, rating: null }
  const doc = new DOMParser().parseFromString(await response.text(), 'text/html')
  const titleEl = doc.querySelector('.problem-statement .title')
  let title = titleEl?.textContent?.trim() || `${contestId}${index}`
  title = title.replace(/^[A-Za-z][0-9]?\.\s*/, '').trim()
  const ratingMatch = doc.body.textContent?.match(/\*(\d{3,4})\b/)
  const rating = ratingMatch ? parseInt(ratingMatch[1], 10) : null
  
  let description = undefined
  const statementEl = doc.querySelector('.problem-statement')
  if (statementEl) {
    const clone = statementEl.cloneNode(true) as HTMLElement
    const header = clone.querySelector('.header')
    if (header) header.remove()
    description = clone.innerHTML.trim()
  }

  return { title: title || `${contestId}${index}`, rating, description }
}

async function processRow(info: AcceptedRowInfo, isManual = false): Promise<void> {
  const processedKey = `cfProcessed_${info.submissionId}`
  
  if (!isManual) {
    const store = await chrome.storage.local.get({ [processedKey]: false })
    if (store[processedKey]) return
    await chrome.storage.local.set({ [processedKey]: true }) // claim it before awaiting, to avoid a duplicate run
  }

  const source = await fetchSubmissionSource(info.contestId, info.submissionId)
  if (!source || !source.code.trim()) {
    if (isManual) alert('AutoPush: Could not extract code. The platform UI may have changed. Please open an issue on GitHub.')
    else console.error('[DSA AutoPush] Accepted detected, but code extraction failed.')
    return
  }
  const problemInfo = await fetchProblemInfo(info.contestId, info.index)

  const payload: Submission = {
    platform: 'codeforces',
    title: problemInfo.title,
    difficulty: problemInfo.rating !== null ? String(problemInfo.rating) : 'unrated',
    language: source.language,
    code: source.code,
    url: `https://codeforces.com/contest/${info.contestId}/problem/${info.index}`,
    meta: { contestId: info.contestId, index: info.index },
    description: problemInfo.description,
  }

  chrome.runtime.sendMessage({ type: 'SUBMISSION_CAPTURED', payload, isManual }, (response: SubmissionResponse) => {
    if (chrome.runtime.lastError) return
    if (!response?.ok) console.warn('[DSA AutoPush] Failed to push submission:', response?.error)
  })
}

function injectManualSyncButton(row: Element, info: AcceptedRowInfo) {
  if (row.querySelector('.dsa-autopush-sync-btn')) return

  const verdictEl = row.querySelector('.verdict-accepted')
  if (!verdictEl) return

  const btn = document.createElement('button')
  btn.className = 'dsa-autopush-sync-btn'
  btn.title = 'Sync w/ AutoPush'
  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-left:6px; color:#f59e0b;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
  `
  btn.style.cssText = `
    background: transparent; border: none; cursor: pointer; padding: 0; outline: none; margin-left: 4px;
    vertical-align: middle; transition: opacity 0.2s; display: inline-flex; align-items: center; justify-content: center;
  `
  btn.onmouseover = () => btn.style.opacity = '0.7'
  btn.onmouseout = () => btn.style.opacity = '1'

  btn.onclick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    btn.style.opacity = '0.4'
    processRow(info, true).then(() => {
      btn.style.opacity = '1'
    })
  }

  verdictEl.parentElement?.appendChild(btn)
}

const checkStatus = debounce(() => {
  findAcceptedRows().forEach(({ row, info }) => {
    injectManualSyncButton(row, info)
    processRow(info)
  })
}, 800)

const observer = new MutationObserver(checkStatus)
observer.observe(document.body, { childList: true, subtree: true })
checkStatus() // rows may already be present (e.g. page loaded after the verdict settled)
