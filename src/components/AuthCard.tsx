import { useState } from 'react'
import { Github, Loader2, CheckCircle2, LogOut } from 'lucide-react'
import { useSaveToken } from '../hooks/useStorage'
import { useGithubUser } from '../hooks/useGithub'
import { getAuthenticatedUser } from '../utils/github'
import logo from '../assets/Logo_option_B.png'

interface AuthCardProps {
  token: string
  setToken: (val: string) => void
  onDisconnect: () => void
}

export function AuthCard({ token, setToken, onDisconnect }: AuthCardProps) {
  const { data: user } = useGithubUser(token)
  const saveTokenMutation = useSaveToken()

  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState('')
  const [inputToken, setInputToken] = useState('')

  const handleSaveToken = async () => {
    const t = inputToken.trim()
    if (!t) return
    setConnecting(true)
    setConnectError('')
    try {
      await getAuthenticatedUser(t)
      await saveTokenMutation.mutateAsync(t)
      setToken(t)
      setInputToken('')
    } catch (error) {
      setConnectError(error instanceof Error ? error.message : String(error))
    } finally {
      setConnecting(false)
    }
  }

  if (!token) {
    return (
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
    )
  }

  const daysRemaining = user?.expirationDate 
    ? Math.max(0, Math.ceil((new Date(user.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="flex items-start justify-between pb-1">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 px-2.5 py-1 rounded-lg text-[11px] font-medium w-fit">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Connected {user ? <span className="text-gray-300 ml-1">@{user.login}</span> : ''}</span>
        </div>
        {daysRemaining !== null && daysRemaining <= 7 && (
          <span className="text-[10px] text-orange-400/90 font-medium ml-1">Token expires in {daysRemaining} days!</span>
        )}
      </div>
      <button
        type="button"
        onClick={onDisconnect}
        className="text-[11px] text-gray-400 hover:text-red-400 flex items-center gap-1.5 px-2 py-1 hover:bg-red-400/10 rounded-lg transition-colors"
      >
        <LogOut className="w-3 h-3" /> Disconnect
      </button>
    </div>
  )
}
