import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, CheckCircle, Trash2, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/auth'
import client from '../api/client'

interface Report { id: number; type: 'Lost'|'Found'; title: string; description: string; category: string; campus_name: string; university_name: string; event_date: string; created_at: string; status: string; moderation_status: string }

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate       = useNavigate()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (!authLoading && !user) navigate('/login') }, [user, authLoading, navigate])

  useEffect(() => {
    if (!user) return
    client.get('/api/reports/my/list')
      .then(({ data }) => setReports(Array.isArray(data) ? data : []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false))
  }, [user])

  async function markResolved(id: number) {
    try {
      await client.patch(`/api/reports/${id}/status`, { status: 'Resolved' })
      setReports((r) => r.map((x) => x.id === id ? { ...x, status: 'Resolved' } : x))
      toast.success('Marked as resolved!')
    } catch { toast.error('Failed') }
  }

  async function deleteReport(id: number) {
    if (!confirm('Delete this report?')) return
    try {
      await client.delete(`/api/reports/${id}`)
      setReports((r) => r.filter((x) => x.id !== id))
      toast.success('Report deleted.')
    } catch { toast.error('Failed') }
  }

  if (authLoading || loading) {
    return (
      <main className="page-shell max-w-5xl space-y-4 py-10" aria-busy="true">
        {[1, 2, 3].map((index) => <div key={index} className="h-24 animate-pulse rounded-xl bg-wash" />)}
      </main>
    )
  }

  return (
    <main className="page-shell max-w-5xl py-8 sm:py-12">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">My reports</h1>
          <p className="mt-2 text-sm text-muted">Signed in as {user?.name}</p>
        </div>
        <Link to="/report" className="btn btn-primary"><Plus size={17} aria-hidden="true" /> New report</Link>
      </div>

      {reports.length === 0 ? (
        <section className="panel px-5 py-12 text-center">
          <h2 className="font-display text-2xl">No reports yet</h2>
          <p className="mt-2 mb-4 text-sm text-muted">Your lost and found reports will appear here.</p>
          <Link to="/report" className="btn btn-primary">Report an item</Link>
        </section>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <article key={report.id} className="panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={'status-label ' + (report.type === 'Lost' ? 'status-lost' : 'status-found')}>{report.type}</span>
                  <span className={'status-label ' + (report.status === 'Resolved' ? 'status-found' : 'bg-wash text-muted')}>{report.status}</span>
                  {report.moderation_status === 'Rejected' && <span className="status-label status-lost">Rejected</span>}
                  <span className="text-xs text-muted">{report.category}</span>
                </div>
                <h2 className="mt-2 break-words font-semibold">{report.title}</h2>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {[report.university_name, report.campus_name, fmt(report.event_date || report.created_at)].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link to={'/items/' + report.id} className="btn btn-secondary">View <ArrowRight size={15} aria-hidden="true" /></Link>
                {report.status === 'Active' && (
                  <button type="button" onClick={() => markResolved(report.id)} title="Mark resolved" aria-label={'Mark ' + report.title + ' resolved'} className="btn btn-secondary px-3 text-accent">
                    <CheckCircle size={17} aria-hidden="true" />
                  </button>
                )}
                <button type="button" onClick={() => deleteReport(report.id)} title="Delete report" aria-label={'Delete ' + report.title} className="btn btn-secondary px-3 text-lost">
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
