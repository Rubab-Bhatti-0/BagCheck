import { useEffect, useRef, useState } from 'react'
import courtyard from '../assets/campus-courtyard.jpg'
import { MapPin, RotateCcw, Search } from 'lucide-react'
import client from '../api/client'
import ReportCard, { type ReportSummary } from '../components/ReportCard'
import { REPORT_CATEGORIES } from '../data/reportCategories'

interface University { id: number; name: string; short_name: string; campuses: { id: number; name: string; city: string }[] }

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
  data: ReportSummary[]
  pagination: { total: number; pages: number }
}

const DEFAULT_FILTERS: Filters = { keyword: '', type: 'All', universityId: '', campusId: '', category: 'All', dateRange: 'all', page: 1 }
const DATE_RANGES = [{ label: 'Any time', value: 'all' }, { label: 'Past 7 days', value: '7d' }, { label: 'Past 30 days', value: '30d' }]

export default function BrowsePage() {
  const [reports, setReports]           = useState<ReportSummary[]>([])
  const [pagination, setPagination]     = useState({ total: 0, pages: 0 })
  const [universities, setUniversities] = useState<University[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')
  const [universitiesError, setUniversitiesError] = useState(false)
  const [universitiesRetry, setUniversitiesRetry] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const resultsRef = useRef<HTMLElement>(null)
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
    resultsRef.current?.scrollIntoView({ block: 'start' })
  }

  function clearFilters() {
    setKeyword('')
    updateFilters(DEFAULT_FILTERS)
  }

  function changePage(page: number) {
    updateFilters({ page })
    resultsRef.current?.scrollIntoView({ block: 'start' })
  }

  return (
    <main className="page-shell pb-16 pt-5 sm:pt-8">
      <section aria-labelledby="browse-title" className="grid overflow-hidden rounded-[1rem] bg-forest text-panel md:grid-cols-[1.06fr_1fr]">
        <div className="px-6 py-9 sm:px-9 md:py-10 lg:px-12 lg:py-11">
          <p className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-wide text-lime">
            <MapPin size={15} aria-hidden="true" /> Campus lost &amp; found
          </p>
          <h1 id="browse-title" className="font-display text-[clamp(2.7rem,5.4vw,4.5rem)] leading-[0.99] tracking-[-0.047em]">
            <span className="block">Lost on campus?</span>
            <span className="mt-1 block text-lime italic">Find it here.</span>
          </h1>
          <p className="mt-5 max-w-[25rem] text-sm leading-6 text-[#dce7d8] sm:text-base">
            Browse lost and found items across university campuses. You can search without an account.
          </p>
          <form onSubmit={handleSearch} role="search" className="mt-6 flex max-w-[29rem] items-center gap-2 rounded-lg bg-panel p-1.5 text-ink">
            <div className="relative min-w-0 flex-1">
              <Search aria-hidden="true" size={17} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="search"
                aria-label="Search reports"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Item or location"
                className="h-11 w-full rounded-md pl-9 pr-1 text-sm placeholder:text-muted"
              />
            </div>
            <button type="submit" className="btn bg-lime px-3 text-forest hover:bg-[#c8e47b] sm:px-4">Search</button>
          </form>
        </div>
        <div className="relative aspect-[2/1] md:aspect-auto">
          <img src={courtyard} alt="" width={1536} height={1024} fetchPriority="high" className="absolute inset-0 h-full w-full object-cover object-[48%_62%]" />
        </div>
      </section>

      <section ref={resultsRef} aria-labelledby="reports-title" className="mt-10 scroll-mt-24 sm:mt-12" aria-busy={loading}>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <h2 id="reports-title" className="font-display text-4xl leading-none tracking-[-0.05em] sm:text-[2.65rem]">Campus reports</h2>
            <p role="status" className="mt-2 min-h-5 text-sm text-muted">
              {loading ? 'Loading reports…' : !error && pagination.total + (pagination.total === 1 ? ' report' : ' reports')}
            </p>
          </div>
          <div role="group" aria-label="Report type" className="inline-flex max-w-full gap-0.5 rounded-lg border border-line bg-wash p-1">
            {(['All', 'Lost', 'Found'] as const).map((option) => (
              <button
                type="button"
                key={option}
                aria-pressed={type === option}
                onClick={() => updateFilters({ type: option })}
                className="min-h-9 whitespace-nowrap rounded-md px-3 text-sm font-medium text-muted hover:text-ink aria-pressed:bg-forest aria-pressed:text-white sm:px-4"
              >
                {option === 'All' ? 'All reports' : option}
              </button>
            ))}
          </div>
        </div>

        <div className="panel mb-5 grid grid-cols-2 gap-x-3 gap-y-3 p-3 sm:p-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.85fr)_auto] lg:items-end">
          <label className="min-w-0">
            <span className="field-label">University</span>
            <select className="field" value={universityId} onChange={(event) => updateFilters({ universityId: event.target.value, campusId: '' })}>
              <option value="">All universities</option>
              {universities.map((university) => <option key={university.id} value={university.id}>{university.name}</option>)}
            </select>
          </label>
          <label className="min-w-0">
            <span className="field-label">Campus</span>
            <select className="field" value={campusId} disabled={!universityId} onChange={(event) => updateFilters({ campusId: event.target.value })}>
              <option value="">All campuses</option>
              {campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}
            </select>
          </label>
          <label className="min-w-0">
            <span className="field-label">Category</span>
            <select className="field" value={category} onChange={(event) => updateFilters({ category: event.target.value })}>
              <option value="All">All categories</option>
              {REPORT_CATEGORIES.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label className="min-w-0">
            <span className="field-label">Date posted</span>
            <select className="field" value={dateRange} onChange={(event) => updateFilters({ dateRange: event.target.value })}>
              {DATE_RANGES.map(({ label, value }) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <button type="button" onClick={clearFilters} className="inline-flex min-h-11 items-center justify-start gap-1.5 rounded-md px-2 text-sm font-semibold whitespace-nowrap text-accent hover:bg-wash lg:justify-center">
            <RotateCcw size={15} aria-hidden="true" /> Clear filters
          </button>
        </div>

        {universitiesError && (
          <div role="alert" className="mb-4 flex flex-wrap justify-between gap-2 rounded-lg bg-lost-tint p-3 text-sm text-lost">
            <span>Could not load universities and campuses.</span>
            <button type="button" onClick={() => setUniversitiesRetry((value) => value + 1)} className="font-semibold underline">Retry universities</button>
          </div>
        )}
        {error && (
          <div role="alert" className="mb-4 flex flex-wrap justify-between gap-2 rounded-lg bg-lost-tint p-3 text-sm text-lost">
            <span>{error}</span>
            <button type="button" onClick={() => updateFilters({ page })} className="font-semibold underline">Retry reports</button>
          </div>
        )}

        {loading ? (
          <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-60 animate-pulse rounded-[0.875rem] bg-wash" />
            ))}
          </div>
        ) : error ? null : reports.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => <ReportCard key={report.id} report={report} />)}
          </div>
        ) : (
          <div className="panel px-5 py-12 text-center">
            <Search size={25} aria-hidden="true" className="mx-auto mb-4 text-accent" />
            <h3 className="font-display text-2xl">No reports found</h3>
            <p className="mx-auto mt-2 mb-5 max-w-xs text-sm leading-6 text-muted">Try a different search or clear your filters.</p>
            <button type="button" onClick={clearFilters} className="btn btn-secondary">Clear filters</button>
          </div>
        )}

        {!error && (pagination.pages > 1 || page > 1) && (
          <nav aria-label="Report pages" className="mt-6 flex items-center justify-between gap-4 text-sm text-muted">
            <button type="button" disabled={loading || page === 1} onClick={() => changePage(page - 1)} className="btn btn-secondary">Previous</button>
            {page <= pagination.pages && <span>Page {page} of {pagination.pages}</span>}
            <button type="button" disabled={loading || page >= pagination.pages} onClick={() => changePage(page + 1)} className="btn btn-secondary">Next</button>
          </nav>
        )}
      </section>
    </main>
  )
}
