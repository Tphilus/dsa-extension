export const STORAGE_KEYS = {
  GITHUB_TOKEN: 'githubToken',
  REPO: 'githubRepo',
  BRANCH: 'githubBranch',
  SUBMISSIONS: 'recentSubmissions',
  OFFLINE_QUEUE: 'offlineQueue',
} as const

export const DEFAULT_BRANCH = 'main'
export const MAX_RECENT_SUBMISSIONS = 50

export const LANGUAGE_EXTENSIONS: Record<string, string> = {
  python: 'py',
  python3: 'py',
  'python 3': 'py',
  cpp: 'cpp',
  'c++': 'cpp',
  'c++14': 'cpp',
  'c++17': 'cpp',
  'c++20': 'cpp',
  'gnu c++17': 'cpp',
  c: 'c',
  java: 'java',
  java8: 'java',
  javascript: 'js',
  'node.js': 'js',
  typescript: 'ts',
  csharp: 'cs',
  'c#': 'cs',
  'mono c#': 'cs',
  golang: 'go',
  go: 'go',
  ruby: 'rb',
  swift: 'swift',
  kotlin: 'kt',
  rust: 'rs',
  scala: 'scala',
  php: 'php',
  racket: 'rkt',
  erlang: 'erl',
  elixir: 'ex',
  dart: 'dart',
  mysql: 'sql',
  'pl/sql': 'sql',
  bash: 'sh',
  shell: 'sh',
  pascal: 'pas',
  perl: 'pl',
  haskell: 'hs',
}

export function slugify(title: string | undefined | null): string {
  const slug = (title || 'untitled')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return slug || 'untitled'
}

export function extensionFor(language: string | undefined | null): string {
  if (!language) return 'txt'
  const key = language.toLowerCase().trim()
  if (LANGUAGE_EXTENSIONS[key]) return LANGUAGE_EXTENSIONS[key]
  const fuzzyMatch = Object.keys(LANGUAGE_EXTENSIONS).find((k) => key.includes(k))
  if (fuzzyMatch) return LANGUAGE_EXTENSIONS[fuzzyMatch]
  const cleaned = key.replace(/[^a-z0-9]/g, '')
  return cleaned || 'txt'
}

const EXT_TO_FENCE: Record<string, string> = {
  py: 'python',
  cpp: 'cpp',
  c: 'c',
  java: 'java',
  js: 'javascript',
  ts: 'typescript',
  cs: 'csharp',
  go: 'go',
  rb: 'ruby',
  swift: 'swift',
  kt: 'kotlin',
  rs: 'rust',
  scala: 'scala',
  php: 'php',
  rkt: 'racket',
  erl: 'erlang',
  ex: 'elixir',
  dart: 'dart',
  sql: 'sql',
  sh: 'bash',
  pas: 'pascal',
  pl: 'perl',
  hs: 'haskell',
}

// Markdown fence language id for a ```-fenced code block, e.g. "cpp" -> "cpp", "js" -> "javascript".
export function fenceLanguageFor(language: string | undefined | null): string {
  const ext = extensionFor(language)
  return EXT_TO_FENCE[ext] || ext
}

// "Next Round" -> "Next-Round" — used for Codeforces folder names (158A-Next-Round),
// which keep title-case words rather than the all-lowercase style of slugify().
export function titleHyphenate(title: string | undefined | null): string {
  const words = (title || 'untitled')
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  return words.join('-') || 'Untitled'
}
