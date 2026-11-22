import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, CheckCircle, Trash2, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
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

  if (authLoading || loading) return (
    <div className="mx-auto max-w-4xl px-5 py-10 animate-pulse space-y-4">
      {[1,2,3].map((i) => <div key={i} className="h-24 rounded-2xl bg-[#1a1d2e]" />)}
    </div>
  )

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Reports</h1>
          <p className="text-sm text-[#94a3b8]">Logged in as <span className="text-white">{user?.name}</span></p>
        </div>
        <Link to="/report" className="flex items-center gap-2 rounded-xl bg-[#22c55e] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#16a34a] transition-colors">
          <Plus size={16} /> New Report
        </Link>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#2d3148] bg-[#1a1d2e] py-16 text-center">
          <p className="text-lg font-semibold mb-2">No reports yet</p>
          <p className="text-sm text-[#94a3b8] mb-5">Post your first lost or found item.</p>
          <Link to="/report" className="rounded-xl bg-[#22c55e] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#16a34a] transition-colors">
            Report an Item
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <div key={r.id} className="flex flex-col gap-4 rounded-2xl border border-[#2d3148] bg-[#1a1d2e] p-5 sm:flex-row sm:items-center">
              <div className="flex-1 min-w-0">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${r.type === 'Lost' ? 'bg-[#ef4444]/15 text-[#ef4444]' : 'bg-[#22c55e]/15 text-[#22c55e]'}`}>{r.type}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    r.status === 'Active' ? 'bg-blue-500/15 text-blue-400' :
                    r.status === 'Resolved' ? 'bg-green-500/15 text-green-400' :
                    'bg-red-500/15 text-red-400'
                  }`}>{r.status}</span>
                  {r.moderation_status === 'Rejected' && <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-xs text-orange-400">Rejected</span>}
                  <span className="text-xs text-[#4b5563]">{r.category}</span>
                </div>
                <p className="font-semibold truncate">{r.title}</p>
                <p className="text-xs text-[#64748b] mt-0.5">{r.university_name} • {r.campus_name} • {r.event_date ? fmt(r.event_date) : fmt(r.created_at)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link to={`/items/${r.id}`} className="flex items-center gap-1 rounded-lg border border-[#2d3148] px-3 py-2 text-xs text-[#94a3b8] hover:text-white transition-colors">
                  View <ArrowRight size={12} />
                </Link>
                {r.status === 'Active' && (
                  <button onClick={() => markResolved(r.id)} title="Mark resolved" className="rounded-lg border border-blue-500/30 p-2 text-blue-400 hover:bg-blue-500/10 transition-colors">
                    <CheckCircle size={16} />
                  </button>
                )}
                <button onClick={() => deleteReport(r.id)} title="Delete" className="rounded-lg border border-[#ef4444]/30 p-2 text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
