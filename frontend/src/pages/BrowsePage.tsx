import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, SlidersHorizontal, Plus, RefreshCw } from 'lucide-react'
import client from '../api/client'
import ReportCard from '../components/ReportCard'

interface University { id: number; name: string; short_name: string; campuses: { id: number; name: string; city: string }[] }
interface Report { id: number; type: 'Lost' | 'Found'; title: string; description: string; category: string; university_id?: number; campus_id?: number; university_name: string; campus_name: string; location: string; event_date: string; created_at: string; photo_url?: string; status: string }

const CATEGORIES = ['All', 'Electronics', 'Wallets & Keys', 'Student Cards & IDs', 'Books & Notes', 'General']
const DATE_RANGES = [{ label: 'All Time', value: 'all' }, { label: 'Past 7 days', value: '7d' }, { label: 'Past 30 days', value: '30d' }]

export default function BrowsePage() {
  const [reports, setReports]           = useState<Report[]>([])
  const [universities, setUniversities] = useState<University[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')
  const [refreshTick, setRefreshTick]   = useState(0)

  const [keyword,       setKeyword]       = useState('')
  const [typeFilter,    setTypeFilter]    = useState<'All' | 'Lost' | 'Found'>('All')
  const [uniId,         setUniId]         = useState('')
  const [campusId,      setCampusId]      = useState('')
  const [category,      setCategory]      = useState('All')
  const [dateRange,     setDateRange]     = useState('all')

  const campuses = useMemo(() => {
    if (!uniId) return []
    const uni = universities.find((u) => String(u.id) === uniId)
    return uni ? uni.campuses : []
  }, [uniId, universities])

  async function fetchReports() {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, string> = {}
      if (keyword)              params.keyword       = keyword
      if (typeFilter !== 'All') params.type          = typeFilter
      if (uniId)                params.university_id = uniId
      if (campusId)             params.campus_id     = campusId
      if (category !== 'All')   params.category      = category
      if (dateRange !== 'all')  params.dateRange     = dateRange
      params.limit = '50'

      const { data } = await client.get('/api/reports', { params })
      const serverReports = Array.isArray(data.data) ? data.data : []
      const normalizedKeyword = keyword.trim().toLowerCase()
      const cutoff = dateRange === '7d' ? Date.now() - 7 * 24 * 60 * 60 * 1000 : dateRange === '30d' ? Date.now() - 30 * 24 * 60 * 60 * 1000 : null
      const visibleReports = serverReports.filter((report: Report) => {
        const matchesKeyword = !normalizedKeyword || `${report.title} ${report.description}`.toLowerCase().includes(normalizedKeyword)
        const matchesType = typeFilter === 'All' || report.type === typeFilter
        const matchesUniversity = !uniId || String(report.university_id) === uniId
        const matchesCampus = !campusId || String(report.campus_id) === campusId
        const matchesCategory = category === 'All' || report.category === category
        const matchesDate = !cutoff || new Date(report.created_at).getTime() >= cutoff
        return matchesKeyword && matchesType && matchesUniversity && matchesCampus && matchesCategory && matchesDate
      })
      setReports(visibleReports)
    } catch {
      setReports([])
      setError('Could not load reports. Make sure the BagCheck backend is running and try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { client.get('/api/universities').then(({ data }) => setUniversities(data)) }, [])
  useEffect(() => { fetchReports() }, [typeFilter, uniId, campusId, category, dateRange, refreshTick]) // eslint-disable-line

  function handleSearch(e: React.FormEvent) { e.preventDefault(); fetchReports() }
  function clearFilters() { setKeyword(''); setTypeFilter('All'); setUniId(''); setCampusId(''); setCategory('All'); setDateRange('all'); setRefreshTick((value) => value + 1) }

  return (
    <main className="mx-auto max-w-7xl px-5 pb-16 pt-8 sm:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#22c55e] mb-1">Public Campus Reports</p>
          <h1 className="text-3xl font-bold tracking-tight">Browse Lost &amp; Found</h1>
          <p className="mt-1 text-sm text-[#94a3b8]">Search recent reports from your campus. No account needed.</p>
        </div>
        <Link
          to="/report"
          className="flex items-center gap-2 rounded-xl bg-[#22c55e] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#16a34a] transition-colors self-start sm:self-auto"
        >
          <Plus size={16} /> Report Item
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="mb-6 rounded-2xl border border-[#2d3148] bg-[#1a1d2e] p-5">
        {/* Search */}
        <form onSubmit={handleSearch} className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4b5563]" size={16} />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder='Try "earbuds" or "wallet" or "library"'
              className="h-11 w-full rounded-xl border border-[#2d3148] bg-[#0f1117] pl-10 pr-4 text-sm text-white placeholder:text-[#4b5563] focus:border-[#22c55e] focus:outline-none"
            />
          </div>
          <button type="submit" className="rounded-xl bg-[#22c55e] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#16a34a] transition-colors">
            Search
          </button>
          <button type="button" onClick={clearFilters} title="Clear filters" className="rounded-xl border border-[#2d3148] p-2.5 text-[#94a3b8] hover:text-white transition-colors">
            <RefreshCw size={16} />
          </button>
        </form>

        {/* Filter row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* University */}
          <select value={uniId} onChange={(e) => { setUniId(e.target.value); setCampusId('') }}
            className="h-10 rounded-xl border border-[#2d3148] bg-[#0f1117] px-3 text-sm text-[#94a3b8] focus:border-[#22c55e] focus:outline-none">
            <option value="">All Universities</option>
            {universities.map((u) => <option key={u.id} value={u.id}>{u.short_name} — {u.name.split(' ').slice(0,2).join(' ')}</option>)}
          </select>

          {/* Campus */}
          <select value={campusId} onChange={(e) => setCampusId(e.target.value)} disabled={!uniId}
            className="h-10 rounded-xl border border-[#2d3148] bg-[#0f1117] px-3 text-sm text-[#94a3b8] focus:border-[#22c55e] focus:outline-none disabled:opacity-40">
            <option value="">All Campuses</option>
            {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {/* Date range */}
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}
            className="h-10 rounded-xl border border-[#2d3148] bg-[#0f1117] px-3 text-sm text-[#94a3b8] focus:border-[#22c55e] focus:outline-none">
            {DATE_RANGES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>

          {/* Type */}
          <div className="flex h-10 items-center gap-1 rounded-xl border border-[#2d3148] bg-[#0f1117] p-1">
            {(['All', 'Lost', 'Found'] as const).map((t) => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`flex-1 rounded-lg px-2 text-xs font-semibold transition-colors ${typeFilter === t ? 'bg-[#22c55e] text-white shadow' : 'text-[#94a3b8] hover:bg-[#1a1d2e] hover:text-white'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Category chips */}
        <div className="mt-3 flex flex-wrap gap-2">
          <SlidersHorizontal size={14} className="mt-1 text-[#4b5563]" />
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${category === c ? 'bg-[#22c55e] text-white' : 'border border-[#2d3148] text-[#94a3b8] hover:text-white'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="mb-4 flex items-center justify-between rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200"><span>{error}</span><button onClick={() => setRefreshTick((value) => value + 1)} className="font-semibold underline">Retry</button></div>}

      {/* Results count */}
      <p className="mb-4 text-sm text-[#94a3b8]">
        <span className="font-semibold text-white">{reports.length}</span> {reports.length === 1 ? 'report' : 'reports'}
      </p>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-[#2d3148] bg-[#1a1d2e] p-5 h-56" />
          ))}
        </div>
      ) : reports.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((r) => <ReportCard key={r.id} report={r} />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#2d3148] bg-[#1a1d2e] px-6 py-16 text-center">
          <p className="text-lg font-semibold">No reports found</p>
          <p className="mt-2 text-sm text-[#94a3b8]">Try a different keyword or clear your filters.</p>
          <div className="mt-5 flex justify-center gap-3">
            <button onClick={clearFilters} className="rounded-xl border border-[#2d3148] px-4 py-2.5 text-sm text-[#94a3b8] hover:text-white transition-colors">
              Clear filters
            </button>
            <Link to="/report" className="rounded-xl bg-[#22c55e] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#16a34a] transition-colors">
              Post a Lost Item
            </Link>
          </div>
        </div>
      )}
    </main>
  )
}
