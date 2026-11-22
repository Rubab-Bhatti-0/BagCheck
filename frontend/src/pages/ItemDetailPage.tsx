import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Mail, MapPin, Building, Calendar, Tag, ArrowLeft, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import client, { assetUrl } from '../api/client'
import { useAuth } from '../context/AuthContext'
import MatchCard from '../components/MatchCard'

interface Report {
  id: number; type: 'Lost'|'Found'; title: string; description: string
  category: string; university_name: string; campus_name: string
  location: string; event_date: string; created_at: string
  photo_url?: string; status: string; contact_email?: string
  user_id: number; user_name: string; matches: any[]
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })
}

export default function ItemDetailPage() {
  const { id }              = useParams()
  const { user }            = useAuth()
  const navigate            = useNavigate()
  const [report, setReport] = useState<Report | null>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState(false)
  const [deleting, setDeleting]   = useState(false)

  useEffect(() => {
    if (!id) return
    client.get(`/api/reports/${id}`)
      .then(({ data }) => { setReport(data); setMatches(data.matches || []) })
      .catch(() => navigate('/browse'))
      .finally(() => setLoading(false))
  }, [id, navigate])

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

  if (loading) return (
    <div className="mx-auto max-w-3xl px-5 py-10 animate-pulse">
      <div className="h-72 rounded-2xl bg-[#1a1d2e] mb-6" />
      <div className="h-8 w-2/3 rounded-lg bg-[#1a1d2e] mb-3" />
      <div className="h-4 rounded-lg bg-[#1a1d2e] mb-2" />
      <div className="h-4 w-4/5 rounded-lg bg-[#1a1d2e]" />
    </div>
  )

  if (!report) return null
  const isLost   = report.type === 'Lost'
  const isOwner  = user && user.id === report.user_id

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white transition-colors">
        <ArrowLeft size={16} /> Back
      </button>

      <article className="overflow-hidden rounded-2xl border border-[#2d3148] bg-[#1a1d2e]">
        {report.photo_url && (
          <img src={assetUrl(report.photo_url)} alt={report.title} className="max-h-72 w-full object-cover" />
        )}
        <div className="p-6 sm:p-8">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${isLost ? 'bg-[#ef4444]/15 text-[#ef4444]' : 'bg-[#22c55e]/15 text-[#22c55e]'}`}>
              {report.type}
            </span>
            <span className="rounded-full border border-[#2d3148] px-3 py-1 text-xs text-[#64748b]">{report.category}</span>
            {report.status === 'Resolved' && (
              <span className="flex items-center gap-1 rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-400">
                <CheckCircle size={12} /> Resolved
              </span>
            )}
          </div>

          <h1 className="mb-3 text-2xl font-bold sm:text-3xl">{report.title}</h1>
          <p className="mb-6 text-sm leading-7 text-[#94a3b8]">{report.description}</p>

          <dl className="grid gap-4 border-t border-[#2d3148] pt-6 sm:grid-cols-2">
            {report.university_name && (
              <div className="flex items-start gap-2">
                <Building size={15} className="mt-0.5 shrink-0 text-[#4b5563]" />
                <div><dt className="text-xs text-[#4b5563]">University</dt><dd className="text-sm font-semibold">{report.university_name}</dd></div>
              </div>
            )}
            {report.campus_name && (
              <div className="flex items-start gap-2">
                <Building size={15} className="mt-0.5 shrink-0 text-[#4b5563]" />
                <div><dt className="text-xs text-[#4b5563]">Campus</dt><dd className="text-sm font-semibold">{report.campus_name}</dd></div>
              </div>
            )}
            {report.location && (
              <div className="flex items-start gap-2">
                <MapPin size={15} className="mt-0.5 shrink-0 text-[#4b5563]" />
                <div><dt className="text-xs text-[#4b5563]">Location</dt><dd className="text-sm font-semibold">{report.location}</dd></div>
              </div>
            )}
            {report.event_date && (
              <div className="flex items-start gap-2">
                <Calendar size={15} className="mt-0.5 shrink-0 text-[#4b5563]" />
                <div><dt className="text-xs text-[#4b5563]">Date</dt><dd className="text-sm font-semibold">{fmt(report.event_date)}</dd></div>
              </div>
            )}
            {report.category && (
              <div className="flex items-start gap-2">
                <Tag size={15} className="mt-0.5 shrink-0 text-[#4b5563]" />
                <div><dt className="text-xs text-[#4b5563]">Category</dt><dd className="text-sm font-semibold">{report.category}</dd></div>
              </div>
            )}
          </dl>

          {/* Contact */}
          <div className="mt-6 rounded-xl border border-[#2d3148] p-4">
            <p className="mb-2 text-sm font-semibold text-[#94a3b8]">Contact</p>
            {user ? (
              report.contact_email ? (
                <a href={`mailto:${report.contact_email}`} className="flex items-center gap-2 text-sm font-semibold text-[#22c55e] hover:underline">
                  <Mail size={15} /> {report.contact_email}
                </a>
              ) : <p className="text-sm text-[#4b5563]">No contact email provided.</p>
            ) : (
              <div className="flex items-center gap-3">
                <p className="text-sm text-[#64748b] blur-sm select-none">hidden@example.com</p>
                <Link to="/login" className="rounded-lg bg-[#22c55e] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#16a34a]">Login to Contact</Link>
              </div>
            )}
          </div>

          {/* Owner actions */}
          {isOwner && report.status === 'Active' && (
            <div className="mt-4 flex gap-3">
              <button onClick={markResolved} disabled={resolving}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {resolving ? 'Updating…' : '✓ Mark as Resolved'}
              </button>
              <button onClick={deleteReport} disabled={deleting}
                className="flex-1 rounded-xl border border-[#ef4444]/30 py-2.5 text-sm font-semibold text-[#ef4444] hover:bg-[#ef4444]/10 disabled:opacity-50 transition-colors">
                {deleting ? 'Deleting…' : 'Delete Report'}
              </button>
            </div>
          )}
        </div>
      </article>

      {/* ML Matches */}
      {matches.length > 0 && (
        <section className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-lg">✨</span>
            <h2 className="text-lg font-bold">AI-Suggested Matches</h2>
            <span className="ml-auto rounded-full bg-[#22c55e]/15 px-2 py-0.5 text-xs font-semibold text-[#22c55e]">{matches.length} found</span>
          </div>
          <div className="space-y-3">
            {matches.map((m: any) => (
              <MatchCard key={m.id || m.matched_report_id} match={{ report_id: m.matched_report_id, score: m.score_percent || m.score, title: m.report?.title || '', description: m.report?.description || '', type: m.report?.type || '', location: m.report?.location || '', event_date: m.report?.event_date || '' }}
                onView={(rid) => navigate(`/items/${rid}`)} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
