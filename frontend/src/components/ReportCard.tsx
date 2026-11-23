import { ArrowUpRight, Backpack, BookOpen, CalendarDays, IdCard, KeyRound, Laptop, MapPin, Package, Shirt, Watch } from 'lucide-react'
import { Link } from 'react-router-dom'
import { assetUrl } from '../api/client'

export interface ReportSummary {
  id: number
  type: 'Lost' | 'Found'
  title: string
  description: string
  category: string
  university_name: string | null
  campus_name: string | null
  location: string | null
  event_date: string | null
  event_time?: string | null
  photo_url?: string | null
}

const categoryIcons = new Map([
  ['Electronics', <Laptop />],
  ['Wallets & Keys', <KeyRound />],
  ['Student Cards & IDs', <IdCard />],
  ['Books & Notes', <BookOpen />],
  ['Clothing', <Shirt />],
  ['Bags', <Backpack />],
  ['Accessories', <Watch />],
])

const reportDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

export default function ReportCard({ report }: { report: ReportSummary }) {
  const location = report.location || report.campus_name
  const eventDate = report.event_date ? new Date(report.event_date) : null
  const date = eventDate && Number.isFinite(eventDate.getTime()) ? reportDate.format(eventDate) : null
  const typeClass = report.type === 'Lost' ? 'status-lost' : 'status-found'

  return (
    <article className="panel group relative flex min-w-0 flex-col overflow-hidden transition-colors hover:border-accent focus-within:border-accent">
      {report.photo_url && (
        <img src={assetUrl(report.photo_url)} alt={report.title} className="aspect-[2/1] w-full border-b border-line object-cover" loading="lazy" />
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-3">
          <span aria-hidden="true" className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-wash text-accent [&_svg]:size-[19px]">
            {categoryIcons.get(report.category) ?? <Package />}
          </span>
          <span className={'status-label ' + typeClass}>
            <span aria-hidden="true" className="size-1.5 rounded-full bg-current" /> {report.type}
          </span>
        </div>
        <p className="mt-4 text-xs font-medium text-muted">{report.category}</p>
        <h3 className="mt-1 text-lg leading-snug font-semibold tracking-[-0.02em]">
          <Link to={'/items/' + report.id} state={{ fromBrowse: true }} className="line-clamp-2 decoration-1 underline-offset-4 after:absolute after:inset-0 group-hover:underline">
            {report.title}
          </Link>
        </h3>
        <p className="mt-1.5 mb-4 line-clamp-2 text-sm leading-5 text-muted">{report.description}</p>

        {(location || report.university_name) && (
          <div className="mt-auto flex items-start gap-2 text-sm text-muted">
            <MapPin size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
            <div className="min-w-0">
              {location && <p className="truncate font-medium text-ink">{location}</p>}
              {report.university_name && <p className="truncate text-xs leading-relaxed">{report.university_name}</p>}
            </div>
          </div>
        )}

        <div className="mt-4 flex min-h-8 items-center justify-between gap-2 border-t border-line pt-3 text-xs text-muted">
          {date ? (
            <div className="flex items-center gap-1.5">
              <CalendarDays size={14} aria-hidden="true" />
              <time dateTime={report.event_date ?? undefined}>{date}</time>
              {report.event_time && <span>· {report.event_time}</span>}
            </div>
          ) : <span />}
          <ArrowUpRight size={18} className="shrink-0 text-accent" aria-hidden="true" />
        </div>
      </div>
    </article>
  )
}
