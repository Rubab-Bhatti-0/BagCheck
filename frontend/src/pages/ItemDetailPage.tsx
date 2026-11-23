import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { Mail, MapPin, Building, CalendarDays, Clock, ArrowLeft, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import client, { assetUrl } from '../api/client'
import { useAuth } from '../context/auth'
import MatchCard from '../components/MatchCard'

interface Report {
  id: number; type: 'Lost'|'Found'; title: string; description: string
  category: string; university_name: string; campus_name: string
  location: string; event_date: string; event_time?: string; created_at: string
  photo_url?: string; status: string; contact_email?: string
  user_id: number | null; moderation_status: string
}

interface StoredMatch {
  match_id: number
  matched_report_id: number
  score: number
  report: Pick<Report, 'title' | 'description' | 'type' | 'location' | 'event_date'>
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })
}

export default function ItemDetailPage() {
  const { id }              = useParams()
  const { user }            = useAuth()
  const navigate            = useNavigate()
  const location            = useLocation()
  const openedFromBrowse    = location.state?.fromBrowse === true
  const [report, setReport] = useState<Report | null>(null)
  const [matchResults, setMatchResults] = useState<{ reportId: string; data: StoredMatch[] } | null>(null)
  const [resolving, setResolving] = useState(false)
  const [deleting, setDeleting]   = useState(false)

  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    const config = { signal: controller.signal }
    client.get<Report>(`/api/reports/${id}`, config)
      .then(({ data }) => {
        if (controller.signal.aborted) return
        setReport(data)
        if (data.moderation_status === 'Approved' && data.status !== 'Deleted') {
          client.get<StoredMatch[]>(`/api/matches/${id}`, config)
            .then(({ data: suggestions }) => {
              if (!controller.signal.aborted) setMatchResults({ reportId: id, data: suggestions })
            })
            .catch(() => {
              if (!controller.signal.aborted) toast.error('Could not load suggested matches.')
            })
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          toast.error('Could not load this report.')
          navigate('/browse', { replace: true })
        }
      })
    return () => controller.abort()
  }, [id, navigate, user?.id])

  async function markResolved() {
    if (!report) return
    setResolving(true)
    try {
      await client.patch(`/api/reports/${report.id}/status`, { status: 'Resolved' })
      toast.success('Marked as resolved!')
      setReport((r) => r ? { ...r, status: 'Resolved' } : r)
    } catch { toast.error('Failed to update status') }
    finally { setResolving(false) }
  }

  async function deleteReport() {
    if (!report || !confirm('Delete this report?')) return
    setDeleting(true)
    try {
      await client.delete(`/api/reports/${report.id}`)
      toast.success('Report deleted.')
      navigate('/dashboard')
    } catch { toast.error('Failed to delete report') }
    finally { setDeleting(false) }
  }

  if (!report || report.id !== Number(id)) {
    return (
      <main aria-busy="true" className="page-shell max-w-4xl py-10">
        <div className="h-72 animate-pulse rounded-xl bg-wash" />
      </main>
    )
  }

  const isOwner = user && user.id === report.user_id
  const matches = matchResults?.reportId === id ? matchResults?.data ?? [] : []
  const facts = [
    { icon: MapPin, label: 'Location', value: report.location },
    { icon: Building, label: 'Campus', value: report.campus_name },
    { icon: Building, label: 'University', value: report.university_name },
    { icon: CalendarDays, label: 'Date', value: report.event_date && fmt(report.event_date) },
    { icon: Clock, label: 'Time', value: report.event_time },
  ].filter(({ value }) => value)

  function closeDetails() {
    if (openedFromBrowse) navigate(-1)
    else navigate('/browse')
  }

  return (
    <main className="page-shell max-w-5xl py-7 sm:py-10">
      <button type="button" onClick={closeDetails} className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-md text-sm font-semibold text-accent hover:underline">
        <ArrowLeft size={17} aria-hidden="true" /> Back to browse
      </button>

      <article className="panel overflow-hidden">
        {report.photo_url && (
          <img src={assetUrl(report.photo_url)} alt={report.title} className="max-h-96 w-full border-b border-line bg-wash object-contain" />
        )}
        <div className="grid gap-7 p-5 sm:p-8 md:grid-cols-[minmax(0,1fr)_minmax(14rem,0.5fr)]">
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className={'status-label ' + (report.type === 'Lost' ? 'status-lost' : 'status-found')}>{report.type}</span>
              <span className="text-sm text-muted">{report.category}</span>
              {report.status === 'Resolved' && (
                <span className="status-label status-found"><CheckCircle size={14} aria-hidden="true" /> Resolved</span>
              )}
            </div>
            <h1 className="page-title break-words">{report.title}</h1>
            <p className="mt-4 text-base leading-7 whitespace-pre-line text-muted">{report.description}</p>

            {isOwner && report.status === 'Active' && (
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={markResolved} disabled={resolving} className="btn btn-primary">
                  <CheckCircle size={16} aria-hidden="true" /> {resolving ? 'Updating…' : 'Mark resolved'}
                </button>
                <button type="button" onClick={deleteReport} disabled={deleting} className="btn btn-secondary text-lost">
                  {deleting ? 'Deleting…' : 'Delete report'}
                </button>
              </div>
            )}
          </div>

          <aside className="rounded-xl bg-wash p-4 sm:p-5">
            {facts.length > 0 && (
              <dl className="space-y-3">
                {facts.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="grid grid-cols-[1rem_minmax(0,1fr)] items-start gap-2.5">
                    <Icon size={16} className="mt-0.5 text-accent" aria-hidden="true" />
                    <div className="min-w-0">
                      <dt className="text-xs text-muted">{label}</dt>
                      <dd className="mt-0.5 text-sm font-medium break-words">{value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            )}

            <div className={facts.length ? 'mt-5 border-t border-line pt-4' : ''}>
              <h2 className="text-sm font-semibold">Contact</h2>
              {user ? (
                report.contact_email ? (
                  <a href={'mailto:' + report.contact_email} className="mt-2 inline-flex items-start gap-2 text-sm font-medium break-all text-accent hover:underline">
                    <Mail size={16} className="shrink-0" aria-hidden="true" /> {report.contact_email}
                  </a>
                ) : <p className="mt-1 text-sm text-muted">Contact details are private.</p>
              ) : (
                <div className="mt-1 text-sm text-muted">
                  <p>Contact details are kept off the public board.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link to={'/login?returnTo=/items/' + report.id} className="btn btn-primary">Log in</Link>
                    <Link to={'/register?returnTo=/items/' + report.id} className="btn btn-secondary">Create account</Link>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </article>

      {matches.length > 0 && (
        <section className="mt-8" aria-labelledby="item-matches">
          <h2 id="item-matches" className="mb-4 font-display text-3xl tracking-tight">Possible matches</h2>
          <div className="space-y-3">
            {matches.map((match) => (
              <MatchCard key={match.match_id} match={{ ...match.report, report_id: match.matched_report_id, score: match.score }}
                onView={(rid) => navigate('/items/' + rid)} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
