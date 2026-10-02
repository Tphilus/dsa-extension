import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Github,
  CheckCircle2,
  XCircle,
  Loader2,
  GitBranch,
  RefreshCw,
  LogOut,
  Search,
  FolderGit2,
  Lock,
  Plus,
  BarChart3,
  Settings,
  Maximize2,
  Flame,
  CalendarDays,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { getSettings, saveSettings, saveToken, getRecentSubmissions, onStorageChanged } from '../utils/storage'
import { listUserRepos, listBranches, getAuthenticatedUser, verifyAccess, createRepo } from '../utils/github'
import { STORAGE_KEYS } from '../utils/constants'
import type { Platform, SubmissionRecord, GithubUser, RepoSummary } from '../utils/types'
import logo from '../assets/Logo_option_B.png'

type AuthResponse = { ok: true } | { ok: false; error: string }

const PLATFORM_LABELS: Record<Platform, string> = {
  leetcode: 'LeetCode',
  hackerrank: 'HackerRank',
  codeforces: 'Codeforces',
}

function getLangIcon(lang: string) {
  const l = lang.toLowerCase();
  if (l.includes('python') || l.includes('pypy') || l === 'py') return 'python/python-original.svg';
  if (l.includes('c++') || l === 'cpp') return 'cplusplus/cplusplus-original.svg';
  if (l.includes('c#') || l === 'csharp') return 'csharp/csharp-original.svg';
  if (l === 'c') return 'c/c-original.svg';
  if (l.includes('java') && !l.includes('script')) return 'java/java-original.svg';
  if (l.includes('javascript') || l === 'js') return 'javascript/javascript-original.svg';
  if (l.includes('typescript') || l === 'ts') return 'typescript/typescript-original.svg';
  if (l.includes('go')) return 'go/go-original.svg';
  if (l.includes('ruby')) return 'ruby/ruby-original.svg';
  if (l.includes('swift')) return 'swift/swift-original.svg';
  if (l.includes('kotlin')) return 'kotlin/kotlin-original.svg';
  if (l.includes('php')) return 'php/php-original.svg';
  if (l.includes('rust')) return 'rust/rust-original.svg';
  return 'devicon/devicon-original.svg'; // fallback
}

function normalizeLanguage(lang: string) {
  const l = lang.toLowerCase();
  if (l.includes('python') || l.includes('pypy') || l === 'py') return 'Python';
  if (l.includes('c++') || l === 'cpp') return 'C++';
  if (l.includes('c#') || l === 'csharp') return 'C#';
  if (l === 'c') return 'C';
  if (l.includes('java') && !l.includes('script')) return 'Java';
  if (l.includes('javascript') || l === 'js') return 'JavaScript';
  if (l.includes('typescript') || l === 'ts') return 'TypeScript';
  if (l.includes('go')) return 'Go';
  if (l.includes('ruby')) return 'Ruby';
  if (l.includes('swift')) return 'Swift';
  if (l.includes('kotlin')) return 'Kotlin';
  if (l.includes('php')) return 'PHP';
  if (l.includes('rust')) return 'Rust';
  return lang.trim();
}

export default function App() {
  const [token, setToken] = useState('')
  const [user, setUser] = useState<GithubUser | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState('')
  const [inputToken, setInputToken] = useState('')
  const [isDashboard] = useState(() => window.innerWidth > 600)
  const [showCharts, setShowCharts] = useState(false)

  const [repos, setRepos] = useState<RepoSummary[]>([])
  const [reposLoading, setReposLoading] = useState(false)
  const [repoQuery, setRepoQuery] = useState('')
  const [repo, setRepo] = useState('')
  const [showCreateRepo, setShowCreateRepo] = useState(false)
  const [newRepoName, setNewRepoName] = useState('')
  const [newRepoPrivate, setNewRepoPrivate] = useState(true)
  const [creatingRepo, setCreatingRepo] = useState(false)
  const [createRepoError, setCreateRepoError] = useState('')
  const [isEditingRepo, setIsEditingRepo] = useState(false)

  const [branches, setBranches] = useState<string[]>([])
  const [branch, setBranch] = useState('main')

  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([])
  const [saveError, setSaveError] = useState('')

  const loadSubmissions = useCallback(async () => {
    setSubmissions(await getRecentSubmissions())
  }, [])

  const refreshRepos = useCallback(async (authToken: string) => {
    setReposLoading(true)
    try {
      setRepos(await listUserRepos(authToken))
    } catch (error) {
      setConnectError(error instanceof Error ? error.message : String(error))
    } finally {
      setReposLoading(false)
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      const settings = await getSettings()
      setToken(settings.token)
      setRepo(settings.repo)
      setBranch(settings.branch)

      if (settings.token) {
        try {
          setUser(await getAuthenticatedUser(settings.token))
          await refreshRepos(settings.token)
        } catch {
          // Token may have been revoked on GitHub's side; leave the UI in a
          // "connected" state with an empty repo list rather than guessing.
        }
      }
    })()

    loadSubmissions()
    const unsubscribe = onStorageChanged((changes, area) => {
      if (area === 'local' && changes[STORAGE_KEYS.SUBMISSIONS]) {
        setSubmissions((changes[STORAGE_KEYS.SUBMISSIONS].newValue as SubmissionRecord[]) || [])
      }
      // Covers the case where opening the GitHub sign-in tab closed this popup
      // mid-connect — the background worker finishes the flow regardless and
      // writes the token here, so the next time this popup opens it picks it up.
      if (area === 'sync' && changes[STORAGE_KEYS.GITHUB_TOKEN]) {
        const newToken = (changes[STORAGE_KEYS.GITHUB_TOKEN].newValue as string) || ''
        setToken(newToken)
        if (newToken) {
          getAuthenticatedUser(newToken).then(setUser).catch(() => setUser(null))
          refreshRepos(newToken)
        }
      }
    })
    return unsubscribe
  }, [loadSubmissions, refreshRepos])

  useEffect(() => {
    if (!repo || !token) {
      setBranches([])
      return
    }
    const [owner, name] = repo.split('/')
    if (!owner || !name) return
    listBranches(token, owner, name)
      .then((list) => {
        setBranches(list)
        setBranch((current) => (list.includes(current) ? current : list[0] || current))
      })
      .catch(() => setBranches([]))
  }, [repo, token])

  const filteredRepos = useMemo(() => {
    const query = repoQuery.trim().toLowerCase()
    const base = query ? repos.filter((r) => r.fullName.toLowerCase().includes(query)) : repos
    return base.slice(0, 30)
  }, [repos, repoQuery])

  const analytics = useMemo(() => {
    const stats = {
      easy: 0,
      medium: 0,
      hard: 0,
      leetcode: 0,
      hackerrank: 0,
      codeforces: 0,
      total: 0,
      languages: {} as Record<string, number>
    }
    for (const sub of submissions) {
      if (sub.status !== 'pushed') continue
      stats.total++
      
      const diff = sub.difficulty?.toLowerCase() || ''
      if (diff.includes('easy')) stats.easy++
      else if (diff.includes('medium')) stats.medium++
      else if (diff.includes('hard')) stats.hard++

      if (sub.platform === 'leetcode') stats.leetcode++
      else if (sub.platform === 'hackerrank') stats.hackerrank++
      else if (sub.platform === 'codeforces') stats.codeforces++
      
      const rawLang = sub.language || 'Unknown'
      const lang = normalizeLanguage(rawLang)
      stats.languages[lang] = (stats.languages[lang] || 0) + 1
    }
    return stats
  }, [submissions])

  const activityStats = useMemo(() => {
    const week = Array(7).fill(false)
    if (!submissions.length) return { streak: 0, week }
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const activeDays = new Set<string>()

    submissions.forEach(sub => {
      if (sub.status !== 'pushed') return
      const d = new Date(sub.timestamp)
      d.setHours(0, 0, 0, 0)
      activeDays.add(d.getTime().toString())
      
      const diffTime = today.getTime() - d.getTime()
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
      if (diffDays >= 0 && diffDays < 7) {
        week[6 - diffDays] = true
      }
    })

    let streak = 0
    let curr = new Date(today)
    if (!activeDays.has(curr.getTime().toString())) {
      curr.setDate(curr.getDate() - 1)
      if (!activeDays.has(curr.getTime().toString())) {
         return { streak: 0, week }
      }
    }

    while (activeDays.has(curr.getTime().toString())) {
      streak++
      curr.setDate(curr.getDate() - 1)
    }
    
    return { streak, week }
  }, [submissions])

  const handleSaveToken = async () => {
    const t = inputToken.trim()
    if (!t) return
    setConnecting(true)
    setConnectError('')
    try {
      const userResponse = await getAuthenticatedUser(t)
      setUser(userResponse)
      await saveToken(t)
      setToken(t)
      await refreshRepos(t)
      setInputToken('')
    } catch (error) {
      setConnectError(error instanceof Error ? error.message : String(error))
    } finally {
      setConnecting(false)
    }
  }

  const handleCreateRepo = async () => {
    const name = newRepoName.trim()
    if (!name || !token) return
    setCreatingRepo(true)
    setCreateRepoError('')
    try {
      const created = await createRepo(token, name, newRepoPrivate)
      setRepos((prev) => [created, ...prev.filter((r) => r.fullName !== created.fullName)])
      setRepo(created.fullName)
      setBranch(created.defaultBranch)
      setShowCreateRepo(false)
      setNewRepoName('')
    } catch (error) {
      setCreateRepoError(error instanceof Error ? error.message : String(error))
    } finally {
      setCreatingRepo(false)
    }
  }

  const handleDisconnect = async () => {
    await saveToken('')
    setToken('')
    setUser(null)
    setRepos([])
    setBranches([])
    setRepo('')
  }

  // Repository/branch selection saves itself — no explicit "Save" step.
  useEffect(() => {
    if (!token || !repo) return
    let cancelled = false
    setSaveError('')
    ;(async () => {
      try {
        await verifyAccess({ token, repo, branch: branch || 'main' })
        if (cancelled) return
        await saveSettings({ token, repo, branch: branch || 'main' })
      } catch (error) {
        if (!cancelled) setSaveError(error instanceof Error ? error.message : String(error))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, repo, branch])

  return (
    <div className={`bg-bg/95 backdrop-blur-xl text-gray-200 flex flex-col font-sans selection:bg-accent/30 overflow-hidden shadow-2xl ring-1 ring-border/50 ${
      isDashboard ? 'w-full h-screen flex-row' : 'w-[380px] max-h-[600px]'
    }`}>
      {/* Sidebar / Main Popup Content */}
      <div className={`flex flex-col flex-shrink-0 ${isDashboard ? 'w-[380px] border-r border-border/40 h-full' : 'w-full max-h-[600px]'}`}>
        <header className="px-5 py-4 border-b border-border/40 flex items-center justify-between bg-surface/30">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="DSA AutoPush Logo" className="w-7 h-7 rounded-lg shadow-lg shadow-accent/20 object-contain" />
            <h1 className="text-[13px] font-semibold tracking-wide text-white">DSA AutoPush</h1>
          </div>
          {!isDashboard && (
            <button
              onClick={() => chrome.tabs.create({ url: 'index.html' })}
              className="p-1.5 text-gray-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
              title="Open in Full Dashboard"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
        </header>

      <div className="px-5 py-4 space-y-4 border-b border-border/40 bg-gradient-to-b from-surface/20 to-transparent">
        {!token ? (
          <div className="flex flex-col items-center text-center py-6 px-2 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-surface flex items-center justify-center ring-1 ring-border/50 shadow-xl overflow-hidden p-1">
              <img src={logo} alt="DSA AutoPush Logo" className="w-full h-full object-contain" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-sm font-semibold text-gray-100">Connect to GitHub</h2>
              <p className="text-[11px] text-gray-400 leading-relaxed max-w-[260px]">
                Sync your accepted solutions from LeetCode, HackerRank &amp; Codeforces straight to GitHub.
              </p>
            </div>

            <div className="w-full h-px bg-gradient-to-r from-transparent via-border/60 to-transparent my-1" />

            <button
              type="button"
              onClick={() => window.open('https://github.com/settings/tokens/new?scopes=repo,workflow&description=DSA%20Tracker%20Extension', '_blank')}
              className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-white active:scale-[0.98] text-gray-900 font-semibold text-xs rounded-xl py-3 transition-all duration-200 shadow-sm"
            >
              <Github className="w-4 h-4" />
              Generate GitHub Token
            </button>
            <div className="flex gap-2 w-full mt-1">
              <input 
                type="password" 
                placeholder="Paste token here..." 
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                className="flex-1 bg-surface border border-border/50 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all placeholder:text-gray-500"
              />
              <button 
                onClick={handleSaveToken}
                disabled={connecting || !inputToken.trim()}
                className="bg-accent hover:bg-accent-hover text-white font-medium text-xs rounded-xl px-4 py-2.5 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 shadow-md shadow-accent/20"
              >
                {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </button>
            </div>
            {connectError && <p className="text-[11px] text-red-400 bg-red-400/10 px-3 py-2 rounded-lg border border-red-400/20">{connectError}</p>}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 px-2.5 py-1 rounded-lg text-[11px] font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Connected {user ? <span className="text-gray-300 ml-1">@{user.login}</span> : ''}</span>
              </div>
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-[11px] text-gray-400 hover:text-red-400 flex items-center gap-1.5 px-2 py-1 hover:bg-red-400/10 rounded-lg transition-colors"
              >
                <LogOut className="w-3 h-3" /> Disconnect
              </button>
            </div>

            {(!repo || isEditingRepo) ? (
              <div className="border border-border/50 rounded-2xl p-3.5 space-y-3.5 bg-surface/40 shadow-inner">
                <Field label="Repository">
                <div className="relative group">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-accent transition-colors" />
                  <input
                    type="text"
                    value={repoQuery}
                    onChange={(e) => setRepoQuery(e.target.value)}
                    placeholder={reposLoading ? 'Loading your repositories…' : 'Search your repositories'}
                    className="w-full bg-surface border border-border/50 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all placeholder:text-gray-500"
                  />
                </div>
                <div className="max-h-36 overflow-y-auto border border-border/50 rounded-xl divide-y divide-border/50 bg-bg/80 shadow-inner custom-scrollbar">
                  {filteredRepos.map((r) => (
                    <button
                      key={r.fullName}
                      type="button"
                      onClick={() => {
                        setRepo(r.fullName)
                        setRepoQuery('')
                      }}
                      className={`w-full flex items-center gap-2.5 text-left px-3 py-2 text-xs hover:bg-surface transition-colors ${
                        repo === r.fullName ? 'bg-surface text-accent font-medium' : 'text-gray-300'
                      }`}
                    >
                      <FolderGit2 className={`w-3.5 h-3.5 shrink-0 ${repo === r.fullName ? 'text-accent' : 'text-gray-500'}`} />
                      <span className="truncate">{r.fullName}</span>
                      {r.private && <Lock className="w-3 h-3 shrink-0 text-gray-500 ml-auto" />}
                    </button>
                  ))}
                  {filteredRepos.length === 0 && !reposLoading && (
                    <p className="text-[11px] text-gray-500 px-3 py-2">No matching repositories.</p>
                  )}
                </div>
                {repo && <p className="text-[11px] text-accent truncate">Selected: {repo}</p>}

                {!showCreateRepo ? (
                  <button
                    type="button"
                    onClick={() => setShowCreateRepo(true)}
                    className="w-full flex items-center justify-center gap-1.5 text-[11px] text-gray-400 hover:text-accent border border-dashed border-border/60 hover:border-accent hover:bg-accent/5 rounded-xl py-2 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create new repository
                  </button>
                ) : (
                  <div className="border border-border/50 rounded-xl p-3 space-y-3 bg-surface/50 shadow-inner">
                    <input
                      type="text"
                      value={newRepoName}
                      onChange={(e) => setNewRepoName(e.target.value)}
                      placeholder="repository-name"
                      className="w-full bg-bg border border-border/50 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-[11px] text-gray-400">
                        <input
                          type="checkbox"
                          checked={newRepoPrivate}
                          onChange={(e) => setNewRepoPrivate(e.target.checked)}
                          className="accent-accent"
                        />
                        Private
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreateRepo(false)
                            setCreateRepoError('')
                          }}
                          className="text-[11px] text-gray-500 hover:text-gray-300"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleCreateRepo}
                          disabled={!newRepoName.trim() || creatingRepo}
                          className="flex items-center gap-1 bg-accent/90 hover:bg-accent text-gray-900 font-medium text-[11px] rounded-md px-2.5 py-1 transition-colors disabled:opacity-60"
                        >
                          {creatingRepo && <Loader2 className="w-3 h-3 animate-spin" />}
                          Create
                        </button>
                      </div>
                    </div>
                    {createRepoError && <p className="text-[11px] text-red-400 leading-snug">{createRepoError}</p>}
                  </div>
                )}
              </Field>

              <Field label="Branch">
                <div className="relative group">
                  <GitBranch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-accent transition-colors" />
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    disabled={!repo}
                    className="w-full bg-surface border border-border/50 rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent disabled:opacity-50 appearance-none transition-all"
                  >
                    {branches.length === 0 && <option value={branch}>{branch || 'main'}</option>}
                    {branches.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>
              {saveError && <p className="text-[11px] text-red-400 bg-red-400/10 px-3 py-2 rounded-lg border border-red-400/20">{saveError}</p>}
              {isEditingRepo && repo && (
                <button 
                  onClick={() => setIsEditingRepo(false)} 
                  className="w-full text-xs font-medium bg-surface border border-border/50 px-3 py-2.5 rounded-xl mt-3 hover:bg-border/40 text-gray-200 transition-all active:scale-[0.98] shadow-sm"
                >
                  Done
                </button>
              )}
            </div>
            ) : (
              <div className="border border-border/50 rounded-xl p-3 bg-gradient-to-br from-surface/40 to-surface/20 flex items-center justify-between shadow-sm">
                <div className="min-w-0">
                  <p className="text-xs text-gray-200 font-medium truncate flex items-center gap-2">
                    <FolderGit2 className="w-4 h-4 text-accent shrink-0" /> 
                    <span className="truncate">{repo}</span>
                  </p>
                  <p className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-1 ml-0.5">
                    <GitBranch className="w-3 h-3 shrink-0" /> 
                    {branch}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingRepo(true)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all shrink-0 ml-2"
                  aria-label="Edit Repository Settings"
                  title="Change Repository"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {token && (
        <div className="px-5 pt-4 pb-3 border-b border-border/40 bg-surface/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-accent" />
              <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Analytics</h2>
              <button 
                onClick={() => setShowCharts(!showCharts)}
                className="ml-1 text-[9px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-gray-400 hover:text-white transition-colors uppercase tracking-wider font-semibold shadow-sm"
              >
                {showCharts ? 'Text' : 'Charts'}
              </button>
            </div>
            <div className="flex items-center gap-1 bg-orange-500/10 text-orange-400 px-2.5 py-1 rounded-full border border-orange-500/20 shadow-sm">
              <Flame className={`w-3.5 h-3.5 ${activityStats.streak > 0 ? 'animate-pulse' : 'opacity-50'}`} />
              <span className="text-[11px] font-bold">{activityStats.streak} Day Streak</span>
            </div>
          </div>
          {showCharts ? (() => {
            const diffData = analytics.total > 0 ? [
              { name: 'Easy', value: analytics.easy, color: '#4ade80' },
              { name: 'Medium', value: analytics.medium, color: '#facc15' },
              { name: 'Hard', value: analytics.hard, color: '#f87171' },
            ].filter(d => d.value > 0) : [
              { name: 'Easy', value: 1, color: '#4ade80' },
              { name: 'Medium', value: 1, color: '#facc15' },
              { name: 'Hard', value: 1, color: '#f87171' },
            ];

            const platData = analytics.total > 0 ? [
              { name: 'LC', count: analytics.leetcode, fill: '#f59e0b' },
              { name: 'CF', count: analytics.codeforces, fill: '#3b82f6' },
              { name: 'HR', count: analytics.hackerrank, fill: '#10b981' },
            ] : [
              { name: 'LC', count: 1, fill: '#f59e0b' },
              { name: 'CF', count: 1, fill: '#3b82f6' },
              { name: 'HR', count: 1, fill: '#10b981' },
            ];

            const langEntries = Object.entries(analytics.languages).sort((a, b) => b[1] - a[1]).slice(0, 3);
            const langData = langEntries.length > 0 ? langEntries.map(([name, count], i) => ({
              name: name.substring(0,3).toUpperCase(),
              origName: name,
              count,
              fill: ['#8b5cf6', '#ec4899', '#06b6d4'][i % 3]
            })) : [
              { name: 'PY', origName: 'Python', count: 1, fill: '#8b5cf6' },
              { name: 'C++', origName: 'C++', count: 1, fill: '#ec4899' },
              { name: 'JS', origName: 'JavaScript', count: 1, fill: '#06b6d4' }
            ];

            return (
              <div className="grid grid-cols-3 gap-2 h-[110px]">
                <div className="bg-surface/60 border border-border/40 rounded-xl p-1.5 flex flex-col shadow-inner relative overflow-hidden group">
                  <span className="text-[8px] font-medium text-gray-500 uppercase tracking-widest mb-0 z-10 px-1 text-center">Difficulty</span>
                  <div className="flex-1 min-h-0 relative -mx-2 mt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={diffData}
                          innerRadius={15}
                          outerRadius={28}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                        >
                          {diffData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff', fontSize: '9px', padding: '2px 6px' }}
                          itemStyle={{ color: '#fff' }}
                          formatter={(value: number, name: string) => [analytics.total === 0 ? 0 : value, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="bg-surface/60 border border-border/40 rounded-xl p-1.5 flex flex-col shadow-inner">
                  <span className="text-[8px] font-medium text-gray-500 uppercase tracking-widest mb-0 px-1 text-center">Platform</span>
                  <div className="flex-1 min-h-0 relative mt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.total > 0 ? platData.filter(d => d.count > 0) : platData} margin={{top: 5, right: 0, left: 0, bottom: 10}}>
                        <XAxis dataKey="name" stroke="#52525b" tick={{fill: '#a1a1aa', fontSize: 8}} axisLine={false} tickLine={false} height={16} tickMargin={2} interval={0} />
                        <Tooltip 
                          cursor={{fill: '#27272a', opacity: 0.4}}
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff', fontSize: '9px', padding: '2px 6px' }}
                          itemStyle={{ color: '#fff' }}
                          formatter={(value: number, name: string, props: any) => [
                            analytics.total === 0 ? 0 : value,
                            props.payload.name === 'LC' ? 'LeetCode' : 
                            props.payload.name === 'CF' ? 'Codeforces' : 
                            props.payload.name === 'HR' ? 'HackerRank' : props.payload.name
                          ]}
                        />
                        <Bar dataKey="count" radius={[2, 2, 2, 2]}>
                          {(analytics.total > 0 ? platData.filter(d => d.count > 0) : platData).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-surface/60 border border-border/40 rounded-xl p-1.5 flex flex-col shadow-inner">
                  <span className="text-[8px] font-medium text-gray-500 uppercase tracking-widest mb-0 px-1 text-center">Language</span>
                  <div className="flex-1 flex items-center justify-evenly min-h-0 mt-1">
                    {langData.map((lang, i) => (
                      <div key={i} className="flex flex-col items-center justify-center group relative cursor-help">
                        <img 
                          src={`https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${getLangIcon(lang.origName)}`} 
                          alt={lang.origName} 
                          className={`w-6 h-6 opacity-90 transition-transform group-hover:scale-110 ${analytics.total === 0 ? 'grayscale opacity-40' : ''}`}
                        />
                        <div className="absolute -top-7 bg-[#18181b] border border-[#27272a] text-white text-[9px] px-1.5 py-0.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                          {lang.origName} : {analytics.total === 0 ? 0 : lang.count}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })() : (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-surface/60 border border-border/40 rounded-xl p-2.5 flex flex-col items-center justify-center shadow-inner hover:bg-surface/80 transition-colors">
                <span className="text-[8px] font-medium text-gray-500 uppercase tracking-widest mb-1">Difficulty</span>
                <div className="flex gap-1.5 text-[9px] font-semibold">
                  <span className="text-green-400" title="Easy">E:{analytics.easy}</span>
                  <span className="text-yellow-400" title="Medium">M:{analytics.medium}</span>
                  <span className="text-red-400" title="Hard">H:{analytics.hard}</span>
                </div>
              </div>
              <div className="bg-surface/60 border border-border/40 rounded-xl p-2.5 flex flex-col items-center justify-center shadow-inner hover:bg-surface/80 transition-colors">
                <span className="text-[8px] font-medium text-gray-500 uppercase tracking-widest mb-1">Platform</span>
                <div className="flex gap-1.5 text-[9px] font-semibold text-gray-300">
                  <span title="LeetCode">LC:{analytics.leetcode}</span>
                  <span title="Codeforces">CF:{analytics.codeforces}</span>
                  <span title="HackerRank">HR:{analytics.hackerrank}</span>
                </div>
              </div>
              <div className="bg-surface/60 border border-border/40 rounded-xl p-2.5 flex flex-col items-center justify-center shadow-inner hover:bg-surface/80 transition-colors">
                <span className="text-[8px] font-medium text-gray-500 uppercase tracking-widest mb-1">Language</span>
                <div className="flex gap-1.5 text-[9px] font-semibold text-gray-300 truncate w-full justify-center">
                  {Object.entries(analytics.languages).length > 0 
                    ? Object.entries(analytics.languages).sort((a, b) => b[1] - a[1]).slice(0,2).map(([lang, count]) => (
                        <span key={lang}>{lang.substring(0,3).toUpperCase()}:{count}</span>
                      ))
                    : <span>N/A</span>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-hidden flex flex-col bg-bg">
        <div className="px-5 py-3 flex items-center justify-between bg-surface/20 border-b border-border/20">
          <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Recent Submissions</h2>
          <button onClick={loadSubmissions} className="p-1.5 text-gray-500 hover:text-accent hover:bg-accent/10 rounded-lg transition-all" aria-label="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className={`flex-1 px-4 py-3 space-y-2.5 ${submissions.length > 0 ? 'overflow-y-auto custom-scrollbar' : 'flex items-center justify-center overflow-hidden'}`}>
          {submissions.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center opacity-60">
              <RefreshCw className="w-8 h-8 text-gray-600 mb-3" />
              <p className="text-[11px] text-gray-400 px-4 max-w-[250px]">
                No submissions captured yet. Solve a problem and submit it — accepted solutions show up here.
              </p>
            </div>
          )}
          {submissions.map((item) => (
            <SubmissionRow key={item.id} item={item} />
          ))}
        </div>
      </div>
      </div>

      {isDashboard && (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-bg/50 p-8 gap-8">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-8 h-8 text-accent" />
            <h2 className="text-2xl font-bold text-white tracking-wide">Dashboard Analytics</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-8 h-[400px]">
            <div className="bg-surface/40 border border-border/40 rounded-3xl p-6 shadow-2xl flex flex-col">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">Problems by Difficulty</h3>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Easy', value: analytics.easy, color: '#4ade80' },
                        { name: 'Medium', value: analytics.medium, color: '#facc15' },
                        { name: 'Hard', value: analytics.hard, color: '#f87171' },
                      ].filter(d => d.value > 0)}
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {
                        [
                          { name: 'Easy', value: analytics.easy, color: '#4ade80' },
                          { name: 'Medium', value: analytics.medium, color: '#facc15' },
                          { name: 'Hard', value: analytics.hard, color: '#f87171' },
                        ].filter(d => d.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))
                      }
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-surface/40 border border-border/40 rounded-3xl p-6 shadow-2xl flex flex-col">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">Submissions by Platform</h3>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'LeetCode', count: analytics.leetcode, fill: '#f59e0b' },
                    { name: 'Codeforces', count: analytics.codeforces, fill: '#3b82f6' },
                    { name: 'HackerRank', count: analytics.hackerrank, fill: '#10b981' },
                  ].filter(d => analytics.total === 0 || d.count > 0)}>
                    <XAxis dataKey="name" stroke="#52525b" tick={{fill: '#a1a1aa'}} axisLine={false} tickLine={false} />
                    <YAxis stroke="#52525b" tick={{fill: '#a1a1aa'}} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip 
                      cursor={{fill: '#27272a', opacity: 0.4}}
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', color: '#fff' }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 6, 6]}>
                      {
                        [
                          { name: 'LeetCode', count: analytics.leetcode, fill: '#f59e0b' },
                          { name: 'Codeforces', count: analytics.codeforces, fill: '#3b82f6' },
                          { name: 'HackerRank', count: analytics.hackerrank, fill: '#10b981' },
                        ].filter(d => analytics.total === 0 || d.count > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-surface/40 border border-border/40 rounded-3xl p-6 shadow-2xl flex flex-col mt-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-accent" />
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Weekly Activity</h3>
              </div>
              <div className="flex items-center gap-1.5 bg-orange-500/10 text-orange-400 px-3 py-1.5 rounded-full border border-orange-500/20 shadow-sm">
                <Flame className={`w-4 h-4 ${activityStats.streak > 0 ? 'animate-pulse' : 'opacity-50'}`} />
                <span className="text-xs font-bold">{activityStats.streak} Day Streak</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              {Array.from({length: 7}).map((_, i) => {
                const d = new Date()
                d.setDate(d.getDate() - (6 - i))
                const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]
                const isActive = activityStats.week[i]
                return (
                  <div key={i} className="flex flex-col items-center gap-3 flex-1">
                    <span className="text-xs font-medium text-gray-500">{dayName}</span>
                    <div className={`w-full h-12 rounded-xl transition-all duration-300 ${isActive ? 'bg-accent shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-surface border border-border/50'}`} />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider ml-1">{label}</span>
      {children}
    </label>
  )
}

function SubmissionRow({ item }: { item: SubmissionRecord }) {
  const isFailed = item.status === 'failed'
  return (
    <div className="bg-surface/50 hover:bg-surface border border-border/50 rounded-xl px-3.5 py-3 flex items-start justify-between gap-3 transition-colors shadow-sm group">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-gray-100 truncate group-hover:text-white transition-colors">{item.title}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-white/5 text-gray-400">{PLATFORM_LABELS[item.platform] || item.platform}</span>
          <span className="text-gray-600">·</span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-white/5 text-gray-400">{item.difficulty || 'N/A'}</span>
          <span className="text-gray-600">·</span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-white/5 text-gray-400">{item.language || 'N/A'}</span>
        </div>
        {item.path && <p className="text-[9.5px] text-gray-500 truncate font-mono mt-1.5 ml-0.5 opacity-70">{item.path}</p>}
        {isFailed && item.error && <p className="text-[10px] text-red-400/90 truncate mt-1 bg-red-400/10 px-2 py-0.5 rounded-md">{item.error}</p>}
      </div>
      {isFailed ? (
        <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5 drop-shadow-sm" />
      ) : (
        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5 drop-shadow-sm" />
      )}
    </div>
  )
}
