import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, SlidersHorizontal, Plus, RefreshCw } from 'lucide-react'
import client from '../api/client'
import ReportCard from '../components/ReportCard'
import { REPORT_CATEGORIES } from '../data/reportCategories'

interface University { id: number; name: string; short_name: string; campuses: { id: number; name: string; city: string }[] }
interface Report { id: number; type: 'Lost' | 'Found'; title: string; description: string; category: string; university_name: string; campus_name: string; location: string; event_date: string; created_at: string; photo_url?: string; status: string }

interface Filters {
  keyword: string
  type: 'All' | 'Lost' | 'Found'
  universityId: string
  campusId: string
  category: string
  dateRange: string
  page: number
}

interface ReportPageData {
  data: Report[]
  pagination: { total: number; pages: number }
}

const DEFAULT_FILTERS: Filters = { keyword: '', type: 'All', universityId: '', campusId: '', category: 'All', dateRange: 'all', page: 1 }
const CATEGORIES = ['All', ...REPORT_CATEGORIES]
const DATE_RANGES = [{ label: 'All Time', value: 'all' }, { label: 'Past 7 days', value: '7d' }, { label: 'Past 30 days', value: '30d' }]

export default function BrowsePage() {
  const [reports, setReports]           = useState<Report[]>([])
  const [pagination, setPagination]     = useState({ total: 0, pages: 0 })
  const [universities, setUniversities] = useState<University[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')
  const [universitiesError, setUniversitiesError] = useState(false)
  const [universitiesRetry, setUniversitiesRetry] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const { type, universityId, campusId, category, dateRange, page } = filters
  const campuses = universities.find((university) => String(university.id) === universityId)?.campuses ?? []

  useEffect(() => {
    const controller = new AbortController()
    client.get<University[]>('/api/universities', { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return
        setUniversities(data)
        setUniversitiesError(false)
      })
      .catch(() => {
        if (!controller.signal.aborted) setUniversitiesError(true)
      })
    return () => controller.abort()
  }, [universitiesRetry])

  useEffect(() => {
    const controller = new AbortController()
    const { keyword, type, universityId, campusId, category, dateRange, page } = filters
    const params = {
      keyword: keyword || undefined,
      type: type === 'All' ? undefined : type,
      university_id: universityId || undefined,
      campus_id: campusId || undefined,
      category: category === 'All' ? undefined : category,
      dateRange: dateRange === 'all' ? undefined : dateRange,
      page,
    }
    client.get<ReportPageData>('/api/reports', { params, signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return
        if (!Array.isArray(data.data) || !data.pagination) throw new Error('Invalid reports response')
        setReports(data.data)
        setPagination(data.pagination)
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('Could not load reports. Try again in a moment.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [filters])

  function updateFilters(changes: Partial<Filters>) {
    setLoading(true)
    setError('')
    setFilters((current) => ({ ...current, page: 1, ...changes }))
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    updateFilters({ keyword: keyword.trim() })
  }

  function clearFilters() {
    setKeyword('')
    updateFilters(DEFAULT_FILTERS)
  }

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
              type="search"
              aria-label="Search reports"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder='Try "earbuds" or "wallet" or "library"'
              className="h-11 w-full rounded-xl border border-[#2d3148] bg-[#0f1117] pl-10 pr-4 text-sm text-white placeholder:text-[#4b5563] focus:border-[#22c55e] focus:outline-none"
            />
          </div>
          <button type="submit" className="rounded-xl bg-[#22c55e] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#16a34a] transition-colors">
            Search
          </button>
          <button type="button" onClick={clearFilters} aria-label="Clear filters" title="Clear filters" className="rounded-xl border border-[#2d3148] p-2.5 text-[#94a3b8] hover:text-white transition-colors">
            <RefreshCw size={16} />
          </button>
        </form>

        {/* Filter row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* University */}
          <select aria-label="University" value={universityId} onChange={(e) => updateFilters({ universityId: e.target.value, campusId: '' })}
            className="h-10 rounded-xl border border-[#2d3148] bg-[#0f1117] px-3 text-sm text-[#94a3b8] focus:border-[#22c55e] focus:outline-none">
            <option value="">All Universities</option>
            {universities.map((u) => <option key={u.id} value={u.id}>{u.short_name} — {u.name.split(' ').slice(0,2).join(' ')}</option>)}
          </select>

          {/* Campus */}
          <select aria-label="Campus" value={campusId} onChange={(e) => updateFilters({ campusId: e.target.value })} disabled={!universityId}
            className="h-10 rounded-xl border border-[#2d3148] bg-[#0f1117] px-3 text-sm text-[#94a3b8] focus:border-[#22c55e] focus:outline-none disabled:opacity-40">
            <option value="">All Campuses</option>
            {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {/* Date range */}
          <select aria-label="Date range" value={dateRange} onChange={(e) => updateFilters({ dateRange: e.target.value })}
            className="h-10 rounded-xl border border-[#2d3148] bg-[#0f1117] px-3 text-sm text-[#94a3b8] focus:border-[#22c55e] focus:outline-none">
            {DATE_RANGES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>

          {/* Type */}
          <div role="group" aria-label="Report type" className="flex h-10 items-center gap-1 rounded-xl border border-[#2d3148] bg-[#0f1117] p-1">
            {(['All', 'Lost', 'Found'] as const).map((t) => (
              <button key={t} aria-pressed={type === t} onClick={() => updateFilters({ type: t })}
                className={`flex-1 rounded-lg px-2 text-xs font-semibold transition-colors ${type === t ? 'bg-[#22c55e] text-white shadow' : 'text-[#94a3b8] hover:bg-[#1a1d2e] hover:text-white'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Category chips */}
        <div role="group" aria-label="Category" className="mt-3 flex flex-wrap gap-2">
          <SlidersHorizontal size={14} className="mt-1 text-[#4b5563]" />
          {CATEGORIES.map((c) => (
            <button key={c} aria-pressed={category === c} onClick={() => updateFilters({ category: c })}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${category === c ? 'bg-[#22c55e] text-white' : 'border border-[#2d3148] text-[#94a3b8] hover:text-white'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {universitiesError && <div role="alert" className="mb-4 flex justify-between rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200"><span>Could not load universities and campuses.</span><button onClick={() => setUniversitiesRetry((value) => value + 1)} className="font-semibold underline">Retry universities</button></div>}
      {error && <div role="alert" className="mb-4 flex justify-between rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200"><span>{error}</span><button onClick={() => updateFilters({ page })} className="font-semibold underline">Retry reports</button></div>}

      {!loading && !error && <p aria-live="polite" className="mb-4 text-sm text-[#94a3b8]">
        <span className="font-semibold text-white">{pagination.total}</span> {pagination.total === 1 ? 'report' : 'reports'}
      </p>}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-[#2d3148] bg-[#1a1d2e] p-5 h-56" />
          ))}
        </div>
      ) : error ? null : reports.length > 0 ? (
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
      {!error && (pagination.pages > 1 || page > 1) && (
        <nav aria-label="Report pages" className="mt-6 flex items-center justify-between gap-4 text-sm text-[#94a3b8]">
          <button type="button" disabled={loading || page === 1} onClick={() => updateFilters({ page: page - 1 })} className="rounded-xl border border-[#2d3148] px-4 py-2 enabled:hover:text-white disabled:opacity-40">Previous</button>
          {page <= pagination.pages && <span>Page {page} of {pagination.pages}</span>}
          <button type="button" disabled={loading || page >= pagination.pages} onClick={() => updateFilters({ page: page + 1 })} className="rounded-xl border border-[#2d3148] px-4 py-2 enabled:hover:text-white disabled:opacity-40">Next</button>
        </nav>
      )}
    </main>
  )
}
