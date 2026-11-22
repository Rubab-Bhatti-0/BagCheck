import { ExternalLink } from 'lucide-react'

interface Match {
  report_id: number
  title: string
  description: string
  type: string
  location: string
  event_date: string
  score: number
}

interface Props {
  match: Match
  onView: (id: number) => void
}

export default function MatchCard({ match, onView }: Props) {
  const score     = typeof match.score === 'number' ? match.score : 0
  const isFound   = match.type === 'Found'
  const scoreColor = score >= 70 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#94a3b8'

  return (
    <div className="flex items-start gap-4 rounded-2xl border border-[#2d3148] bg-[#13162a] p-4 hover:border-[#3d4168] transition-colors">
      {/* Score ring */}
      <div className="flex shrink-0 flex-col items-center gap-1">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2" style={{ borderColor: scoreColor }}>
          <span className="text-sm font-bold" style={{ color: scoreColor }}>{Math.round(score)}%</span>
        </div>
        <span className="text-xs text-[#4b5563]">match</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="mb-1 flex items-center gap-2">
          <span className={`text-xs font-bold uppercase ${isFound ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>{match.type}</span>
        </div>
        <p className="font-semibold text-sm truncate">{match.title}</p>
        <p className="text-xs text-[#64748b] mt-0.5 line-clamp-2">{match.description}</p>
        {match.location && <p className="mt-1 text-xs text-[#4b5563]">📍 {match.location}</p>}
      </div>
      <button onClick={() => onView(match.report_id)}
        className="flex shrink-0 items-center gap-1 rounded-lg border border-[#22c55e]/30 px-3 py-2 text-xs font-semibold text-[#22c55e] hover:bg-[#22c55e]/10 transition-colors">
        View <ExternalLink size={12} />
      </button>
    </div>
  )
}
