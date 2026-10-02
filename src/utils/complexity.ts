// Best-effort static heuristics for Big-O time/space — NOT a real analyzer.
// True complexity analysis needs semantic understanding of the algorithm,
// which a regex/AST-free scan can't provide. This estimates from loop
// nesting depth and common "allocate space proportional to n" patterns, and
// the generated README says plainly that it's an estimate to verify.
export interface ComplexityEstimate {
  time: string
  space: string
}

const LOOP_MARKER = '\u0001'

function markLoopStarts(code: string): string {
  return code.replace(/\b(for|while)\s*\(/g, (m) => LOOP_MARKER + m)
}

// Brace-counting languages (C/C++/Java/C#/JS/TS/Go/Rust/...): track a stack of
// "this loop's body opened at brace depth N" so sequential loops at the same
// depth don't get counted as nested.
function estimateNestingDepthBraces(code: string): number {
  const marked = markLoopStarts(code)
  let braceDepth = 0
  const loopStack: number[] = []
  let maxDepth = 0
  let pendingLoop = false

  for (const ch of marked) {
    if (ch === LOOP_MARKER) {
      pendingLoop = true
      continue
    }
    if (ch === '{') {
      braceDepth++
      if (pendingLoop) {
        loopStack.push(braceDepth)
        maxDepth = Math.max(maxDepth, loopStack.length)
        pendingLoop = false
      }
    } else if (ch === '}') {
      if (loopStack.length && braceDepth === loopStack[loopStack.length - 1]) {
        loopStack.pop()
      }
      braceDepth = Math.max(0, braceDepth - 1)
    }
  }
  return maxDepth
}

// Python: no braces, so nesting is tracked by indentation level instead.
function estimateNestingDepthIndentation(code: string): number {
  const stack: number[] = []
  let maxDepth = 0
  for (const rawLine of code.split('\n')) {
    if (!rawLine.trim()) continue
    const indent = rawLine.match(/^[ \t]*/)?.[0].length ?? 0
    while (stack.length && indent <= stack[stack.length - 1]) stack.pop()
    if (/^\s*(for|while)\b.*:\s*$/.test(rawLine)) {
      stack.push(indent)
      maxDepth = Math.max(maxDepth, stack.length)
    }
  }
  return maxDepth
}

const BIG_O_BY_DEPTH = ['O(1)', 'O(n)', 'O(n^2)', 'O(n^3)']

function bigOForDepth(depth: number): string {
  return BIG_O_BY_DEPTH[depth] ?? `O(n^${depth})`
}

const QUADRATIC_SPACE_PATTERNS = [
  /\[\s*\[\s*0?\s*\]\s*\*\s*\w+\s*for\s+_?\s*in\s+range/, // python [[0]*m for _ in range(n)]
  /\bnew\s+\w+\[\s*\w*\s*\]\s*\[\s*\w*\s*\]/, // Java/C#: new int[n][m]
  /\bvector\s*<\s*vector\s*</i, // C++ vector<vector<...>>
]

const LINEAR_SPACE_PATTERNS = [
  /\bnew\s+\w+\[\s*\w*\s*\]/, // Java/C#/JS: new Type[n]
  /\bnew\s+(Array|Map|Set|HashMap|HashSet|ArrayList|List|Dictionary)\s*[<(]/i,
  /\bvector\s*<[^>]+>\s*\w+\s*\(/, // C++ vector<T> v(n)
  /\[\s*0?\s*\]\s*\*\s*\w+/, // python [0] * n
  /\bdict\s*\(\s*\)|\{\s*\}/, // map/set literal
  /\bmalloc\s*\(/,
]

function estimateSpaceComplexity(code: string): string {
  if (QUADRATIC_SPACE_PATTERNS.some((pattern) => pattern.test(code))) return 'O(n^2)'
  if (LINEAR_SPACE_PATTERNS.some((pattern) => pattern.test(code))) return 'O(n)'
  return 'O(1)'
}

export function estimateComplexity(code: string, language: string): ComplexityEstimate {
  const isPython = /python/i.test(language)
  const depth = isPython ? estimateNestingDepthIndentation(code) : estimateNestingDepthBraces(code)
  return {
    time: bigOForDepth(depth),
    space: estimateSpaceComplexity(code),
  }
}
