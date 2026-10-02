import { CheckCircle2, XCircle } from 'lucide-react'
import { PLATFORM_LABELS } from '../utils/helpers'
import type { SubmissionRecord } from '../utils/types'

export function SubmissionRow({ item }: { item: SubmissionRecord }) {
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
