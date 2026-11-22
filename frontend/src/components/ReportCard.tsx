import { assetUrl } from '../api/client'

interface Report {
  id: number
  type: 'Lost' | 'Found'
  title: string
  description: string
  category: string
  university_name: string
  campus_name: string
  location: string
  event_date: string
  created_at: string
  photo_url?: string
  status: string
}

interface Props {
  report: Report
  onOpen: (id: number) => void
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ReportCard({ report, onOpen }: Props) {
  const isLost = report.type === 'Lost'
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-[#2d3148] bg-[#1a1d2e] transition hover:-translate-y-0.5 hover:border-[#3d4168] hover:shadow-xl hover:shadow-black/30">
      {report.photo_url ? (
        <img src={assetUrl(report.photo_url)} alt={report.title} className="h-44 w-full object-cover" />
      ) : (
        <div className="flex h-44 w-full items-center justify-center bg-[#13162a] text-[#2d3148]">
          <svg viewBox="0 0 48 48" fill="none" className="h-14 w-14"><rect x="8" y="14" width="32" height="24" rx="3" stroke="currentColor" strokeWidth="2"/><path d="M16 14v-2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2"/><circle cx="24" cy="26" r="4" stroke="currentColor" strokeWidth="2"/></svg>
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${isLost ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isLost ? 'bg-[#ef4444]' : 'bg-[#22c55e]'}`} />
            {report.type}
          </span>
          <span className="rounded-full border border-[#2d3148] px-2 py-0.5 text-xs text-[#64748b]">{report.category}</span>
        </div>
        <h2 className="mb-1 text-base font-semibold leading-snug text-white line-clamp-2">
          <button className="text-left hover:text-[#22c55e] transition-colors" onClick={() => onOpen(report.id)}>
            {report.title}
          </button>
        </h2>
        <p className="mb-3 text-xs text-[#64748b] line-clamp-2">{report.description}</p>
        <div className="mt-auto space-y-1 text-xs text-[#64748b]">
          <p>📍 {report.location || report.campus_name}</p>
          <p>🏫 {report.university_name}</p>
          <p>📅 {report.event_date ? formatDate(report.event_date) : '—'}</p>
        </div>
        <button
          onClick={() => onOpen(report.id)}
          className={`mt-4 w-full rounded-xl py-2 text-sm font-semibold transition-colors ${isLost ? 'border border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/10' : 'border border-[#22c55e]/30 text-[#22c55e] hover:bg-[#22c55e]/10'}`}
        >
          View Details
        </button>
      </div>
    </article>
  )
}
