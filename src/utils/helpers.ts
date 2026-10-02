import { Platform } from './types'

export const PLATFORM_LABELS: Record<Platform, string> = {
  leetcode: 'LeetCode',
  hackerrank: 'HackerRank',
  codeforces: 'Codeforces',
}

export function getLangIcon(lang: string) {
  const l = lang.toLowerCase()
  if (l.includes('python') || l.includes('pypy') || l === 'py') return 'python/python-original.svg'
  if (l.includes('c++') || l === 'cpp') return 'cplusplus/cplusplus-original.svg'
  if (l.includes('c#') || l === 'csharp') return 'csharp/csharp-original.svg'
  if (l === 'c') return 'c/c-original.svg'
  if (l.includes('java') && !l.includes('script')) return 'java/java-original.svg'
  if (l.includes('javascript') || l === 'js') return 'javascript/javascript-original.svg'
  if (l.includes('typescript') || l === 'ts') return 'typescript/typescript-original.svg'
  if (l.includes('go')) return 'go/go-original.svg'
  if (l.includes('ruby')) return 'ruby/ruby-original.svg'
  if (l.includes('swift')) return 'swift/swift-original.svg'
  if (l.includes('kotlin')) return 'kotlin/kotlin-original.svg'
  if (l.includes('php')) return 'php/php-original.svg'
  if (l.includes('rust')) return 'rust/rust-original.svg'
  return 'devicon/devicon-original.svg'
}

export function normalizeLanguage(lang: string) {
  const l = lang.toLowerCase()
  if (l.includes('python') || l.includes('pypy') || l === 'py') return 'Python'
  if (l.includes('c++') || l === 'cpp') return 'C++'
  if (l.includes('c#') || l === 'csharp') return 'C#'
  if (l === 'c') return 'C'
  if (l.includes('java') && !l.includes('script')) return 'Java'
  if (l.includes('javascript') || l === 'js') return 'JavaScript'
  if (l.includes('typescript') || l === 'ts') return 'TypeScript'
  if (l.includes('go')) return 'Go'
  if (l.includes('ruby')) return 'Ruby'
  if (l.includes('swift')) return 'Swift'
  if (l.includes('kotlin')) return 'Kotlin'
  if (l.includes('php')) return 'PHP'
  if (l.includes('rust')) return 'Rust'
  return lang.trim()
}
