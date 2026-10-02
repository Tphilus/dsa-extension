import { useEffect, useState, useMemo } from 'react'
import {
  Loader2,
  GitBranch,
  RefreshCw,
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
import { useSettings, useSubmissions, useSaveToken, useSaveSettings } from '../hooks/useStorage'
import { useGithubRepos, useGithubBranches, useCreateRepo, useVerifyAccess } from '../hooks/useGithub'
import { getLangIcon, normalizeLanguage } from '../utils/helpers'
import { AuthCard } from '../components/AuthCard'
import { SubmissionRow } from '../components/SubmissionRow'
import { Field } from '../components/Field'
import logo from '../assets/Logo_option_B.png'

export default function App() {
  const { data: settings } = useSettings()
  const { data: submissions = [] } = useSubmissions()

  const [token, setToken] = useState('')
  const [repo, setRepo] = useState('')
  const [branch, setBranch] = useState('')

  useEffect(() => {
    if (settings) {
      if (!token && settings.token) setToken(settings.token)
      if (!repo && settings.repo) setRepo(settings.repo)
      if (!branch && settings.branch) setBranch(settings.branch)
    }
  }, [settings, token, repo, branch])

  const { data: repos = [], isLoading: reposLoading } = useGithubRepos(token)
  const { data: branches = [] } = useGithubBranches(token, repo)

  const createRepoMutation = useCreateRepo()
  const verifyAccessMutation = useVerifyAccess()
  const saveTokenMutation = useSaveToken()
  const saveSettingsMutation = useSaveSettings()

  const [isDashboard] = useState(() => window.innerWidth > 600)
  const [showCharts, setShowCharts] = useState(false)

  const [repoQuery, setRepoQuery] = useState('')
  const [showCreateRepo, setShowCreateRepo] = useState(false)
  const [newRepoName, setNewRepoName] = useState('')
  const [newRepoPrivate, setNewRepoPrivate] = useState(true)
  const [createRepoError, setCreateRepoError] = useState('')
  const [isEditingRepo, setIsEditingRepo] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (branches.length > 0 && (!branch || !branches.includes(branch))) {
      setBranch(branches[0])
    }
  }, [branches, branch])

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



  const handleCreateRepo = async () => {
    const name = newRepoName.trim()
    if (!name || !token) return
    setCreateRepoError('')
    try {
      const created = await createRepoMutation.mutateAsync({ token, name, isPrivate: newRepoPrivate })
      setRepo(created.fullName)
      setBranch(created.defaultBranch)
      setShowCreateRepo(false)
      setNewRepoName('')
    } catch (error) {
      setCreateRepoError(error instanceof Error ? error.message : String(error))
    }
  }

  const handleDisconnect = async () => {
    await saveTokenMutation.mutateAsync('')
    setToken('')
    setRepo('')
    setBranch('')
  }

  // Repository/branch selection saves itself — no explicit "Save" step.
  useEffect(() => {
    if (!token || !repo) return
    let cancelled = false
    setSaveError('')
    verifyAccessMutation.mutateAsync({ token, repo, branch: branch || 'main' })
      .then(() => {
        if (!cancelled) saveSettingsMutation.mutate({ token, repo, branch: branch || 'main' })
      })
      .catch((error) => {
        if (!cancelled) setSaveError(error instanceof Error ? error.message : String(error))
      })
    return () => {
      cancelled = true
    }
  }, [token, repo, branch])

  return (
    <div className={`bg-bg/95 backdrop-blur-xl text-gray-200 flex flex-col font-sans selection:bg-accent/30 overflow-hidden shadow-2xl ring-1 ring-border/50 ${isDashboard ? 'w-full h-screen flex-row' : 'w-[380px] max-h-[600px]'
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
          <AuthCard
            token={token}
            setToken={setToken}
            onDisconnect={handleDisconnect}
          />

          {token && (
            <>
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
                          className={`w-full flex items-center gap-2.5 text-left px-3 py-2 text-xs hover:bg-surface transition-colors ${repo === r.fullName ? 'bg-surface text-accent font-medium' : 'text-gray-300'
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
                              disabled={!newRepoName.trim() || createRepoMutation.isPending}
                              className="flex items-center gap-1 bg-accent/90 hover:bg-accent text-gray-900 font-medium text-[11px] rounded-md px-2.5 py-1 transition-colors disabled:opacity-60"
                            >
                              {createRepoMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
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
                name: name.substring(0, 3).toUpperCase(),
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
                            formatter={(value: any, name: any) => [analytics.total === 0 ? 0 : value, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-surface/60 border border-border/40 rounded-xl p-1.5 flex flex-col shadow-inner">
                    <span className="text-[8px] font-medium text-gray-500 uppercase tracking-widest mb-0 px-1 text-center">Platform</span>
                    <div className="flex-1 min-h-0 relative mt-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.total > 0 ? platData.filter(d => d.count > 0) : platData} margin={{ top: 5, right: 0, left: 0, bottom: 10 }}>
                          <XAxis dataKey="name" stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 8 }} axisLine={false} tickLine={false} height={16} tickMargin={2} interval={0} />
                          <Tooltip
                            cursor={{ fill: '#27272a', opacity: 0.4 }}
                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff', fontSize: '9px', padding: '2px 6px' }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(value: any, _name: any, props: any) => [
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
                      ? Object.entries(analytics.languages).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([lang, count]) => (
                        <span key={lang}>{lang.substring(0, 3).toUpperCase()}:{count}</span>
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
                    <XAxis dataKey="name" stroke="#52525b" tick={{ fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#52525b" tick={{ fill: '#a1a1aa' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: '#27272a', opacity: 0.4 }}
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
              {Array.from({ length: 7 }).map((_, i) => {
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