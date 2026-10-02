export function debounce<T extends (...args: never[]) => void>(fn: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), wait)
  }
}

// Tries, in order: Monaco, CodeMirror (5/6), Ace, a plain <textarea>, then any <pre>/<code>.
// Covers every editor widely used by LeetCode, HackerRank, and Codeforces.
export function extractEditorCode(root: ParentNode = document): string {
  const monacoLines = root.querySelectorAll<HTMLElement>('.monaco-editor .view-lines .view-line')
  if (monacoLines.length > 0) {
    return Array.from(monacoLines)
      .sort((a, b) => parseTop(a) - parseTop(b))
      .map((line) => line.textContent?.replace(/ /g, ' ') ?? '')
      .join('\n')
  }

  const cmLines = root.querySelectorAll<HTMLElement>('.CodeMirror-code .CodeMirror-line, .cm-content .cm-line')
  if (cmLines.length > 0) {
    return Array.from(cmLines)
      .map((line) => line.textContent?.replace(/ /g, ' ') ?? '')
      .join('\n')
  }

  const aceLines = root.querySelectorAll<HTMLElement>('.ace_line')
  if (aceLines.length > 0) {
    return Array.from(aceLines)
      .map((line) => line.textContent ?? '')
      .join('\n')
  }

  const textarea = root.querySelector<HTMLTextAreaElement>(
    'textarea#sourceCodeTextarea, textarea[name="source"], textarea',
  )
  if (textarea && textarea.value && textarea.value.trim().length > 0) {
    return textarea.value
  }

  const pre = root.querySelector('pre#program-source-text, pre code, pre')
  if (pre) return pre.textContent ?? ''

  return ''
}

function parseTop(el: HTMLElement): number {
  const match = /top:\s*(-?\d+(?:\.\d+)?)px/.exec(el.getAttribute('style') || '')
  return match ? parseFloat(match[1]) : 0
}

// Finds a leaf element whose trimmed text matches `text` exactly, optionally
// scoped to a selector. Avoids false positives from matching inside paragraphs.
export function findElementByExactText(root: ParentNode, text: string, selectorHint?: string): Element | null {
  const candidates = selectorHint
    ? root.querySelectorAll(selectorHint)
    : root.querySelectorAll('span, div, p, strong, b')
  for (const el of candidates) {
    if (el.children.length === 0 && el.textContent?.trim() === text) {
      return el
    }
  }
  return null
}
