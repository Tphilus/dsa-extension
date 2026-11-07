// Runs in the page's MAIN world (see manifest "world": "MAIN") so it can reach
// HackerRank's Monaco instance. The isolated content script can't see
// window.monaco, and Monaco's DOM only renders the lines currently on screen,
// so reading the DOM loses any code that is scrolled out of view.

interface MonacoModel {
  getValue(): string
  getLanguageId?: () => string
  getModeId?: () => string
  isDisposed?: () => boolean
}

interface MonacoEditor {
  getModel(): MonacoModel | null
  hasTextFocus?: () => boolean
}

interface MonacoGlobal {
  editor: {
    getModels(): MonacoModel[]
    getEditors?: () => MonacoEditor[]
  }
}

function readEditor(): { code: string; language: string } | null {
  const monaco = (window as unknown as { monaco?: MonacoGlobal }).monaco
  if (!monaco?.editor) return null

  let model: MonacoModel | null = null
  const editors = monaco.editor.getEditors?.() ?? []
  // Prefer the editor the user is typing in, then the longest live model
  // (HackerRank also creates small models for custom input / diff views).
  model = editors.find((e) => e.hasTextFocus?.())?.getModel() ?? null
  if (!model) {
    const candidates = [...editors.map((e) => e.getModel()), ...monaco.editor.getModels()].filter(
      (m): m is MonacoModel => !!m && !m.isDisposed?.(),
    )
    candidates.sort((a, b) => b.getValue().length - a.getValue().length)
    model = candidates[0] ?? null
  }
  if (!model) return null

  const language = model.getLanguageId?.() ?? model.getModeId?.() ?? ''
  return { code: model.getValue(), language }
}

window.addEventListener('message', (event) => {
  if (event.source !== window) return
  const data = event.data as { source?: string; type?: string; id?: string }
  if (data?.source !== 'dsa-autopush' || data.type !== 'GET_EDITOR_CODE') return

  let result: { code: string; language: string } | null = null
  try {
    result = readEditor()
  } catch {
    result = null
  }
  window.postMessage({ source: 'dsa-autopush', type: 'EDITOR_CODE', id: data.id, result }, '*')
})
