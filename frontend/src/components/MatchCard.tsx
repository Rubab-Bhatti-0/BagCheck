import { ArrowUpRight, MapPin } from 'lucide-react'

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
  const typeClass = match.type === 'Found' ? 'status-found' : 'status-lost'

  return (
    <article className="panel flex flex-wrap items-center gap-3 p-4 sm:gap-4">
      <div className="min-w-0 basis-full sm:flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className={'status-label ' + typeClass}>{match.type}</span>
          <span className="text-xs font-medium text-muted">{Math.round(match.score)}% similarity</span>
        </div>
        <h3 className="text-base font-semibold">{match.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted">{match.description}</p>
        {match.location && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
            <MapPin size={14} aria-hidden="true" /> {match.location}
          </p>
        )}
      </div>
      <button type="button" onClick={() => onView(match.report_id)} className="btn btn-secondary">
        View report <ArrowUpRight size={15} aria-hidden="true" />
      </button>
    </article>
  )
}
