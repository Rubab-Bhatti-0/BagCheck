import { Search, SlidersHorizontal } from 'lucide-react'

export interface University {
  id: number
  name: string
  short_name: string
  campuses: { id: number; name: string; city: string }[]
}

export interface FilterState {
  query: string
  typeFilter: 'All' | 'Lost' | 'Found'
  universityId: string
  campusId: string
  category: string
  dateRange: 'all' | '7d' | '30d'
}

interface FilterBarProps {
  filters: FilterState
  universities: University[]
  onFilterChange: (filters: Partial<FilterState>) => void
  onClear: () => void
}

const CATEGORIES = ['All', 'Electronics', 'Wallets & Keys', 'Documents', 'Books & Notes', 'General']

export default function FilterBar({ filters, universities, onFilterChange, onClear }: FilterBarProps) {
  const selectedUniversity = universities.find((u) => String(u.id) === filters.universityId)

  return (
    <div className="rounded-2xl border border-[#2d3148] bg-[#1a1d2e] p-4 sm:p-5 space-y-4">
      {/* Row 1: search + university + campus + type */}
      <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto] lg:items-end">
        {/* Search */}
        <div>
          <label htmlFor="report-search" className="mb-1.5 block text-xs font-semibold text-[#94a3b8]">
            Search
          </label>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#4a5280]" />
            <input
              id="report-search"
              type="search"
              value={filters.query}
              onChange={(e) => onFilterChange({ query: e.target.value })}
              placeholder='Try "earbuds" or "library"'
              className="h-10 w-full rounded-xl border border-[#2d3148] bg-[#0f1117] pl-9 pr-4 text-sm text-white placeholder:text-[#4a5280] outline-none focus:border-[#22c55e]/50 focus:ring-2 focus:ring-[#22c55e]/10 transition"
            />
          </div>
        </div>

        {/* University */}
        <div className="min-w-[180px]">
          <label htmlFor="uni-filter" className="mb-1.5 block text-xs font-semibold text-[#94a3b8]">
            University
          </label>
          <select
            id="uni-filter"
            value={filters.universityId}
            onChange={(e) => onFilterChange({ universityId: e.target.value, campusId: '' })}
            className="h-10 w-full rounded-xl border border-[#2d3148] bg-[#0f1117] px-3 text-sm text-white outline-none focus:border-[#22c55e]/50 focus:ring-2 focus:ring-[#22c55e]/10 transition"
          >
            <option value="">All universities</option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.short_name ?? u.name}
              </option>
            ))}
          </select>
        </div>

        {/* Campus */}
        {selectedUniversity && (
          <div className="min-w-[160px]">
            <label htmlFor="campus-filter" className="mb-1.5 block text-xs font-semibold text-[#94a3b8]">
              Campus
            </label>
            <select
              id="campus-filter"
              value={filters.campusId}
              onChange={(e) => onFilterChange({ campusId: e.target.value })}
              className="h-10 w-full rounded-xl border border-[#2d3148] bg-[#0f1117] px-3 text-sm text-white outline-none focus:border-[#22c55e]/50 focus:ring-2 focus:ring-[#22c55e]/10 transition"
            >
              <option value="">All campuses</option>
              {selectedUniversity.campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Type toggle */}
        <div>
          <span className="mb-1.5 block text-xs font-semibold text-[#94a3b8]">Type</span>
          <div className="flex h-10 items-center rounded-xl bg-[#0f1117] border border-[#2d3148] p-1" role="group">
            {(['All', 'Lost', 'Found'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onFilterChange({ typeFilter: t })}
                className={`h-8 min-w-14 rounded-lg px-3 text-sm font-semibold transition ${
                  filters.typeFilter === t
                    ? t === 'Lost'
                      ? 'bg-[#ef4444]/20 text-[#ef4444]'
                      : t === 'Found'
                        ? 'bg-[#22c55e]/20 text-[#22c55e]'
                        : 'bg-[#2d3148] text-white'
                    : 'text-[#4a5280] hover:text-[#94a3b8]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: category chips + date range + clear */}
      <div className="flex flex-wrap items-center gap-2">
        <SlidersHorizontal size={14} className="text-[#4a5280] shrink-0" />
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onFilterChange({ category: cat === 'All' ? '' : cat })}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              (cat === 'All' && !filters.category) || filters.category === cat
                ? 'bg-[#22c55e] text-white'
                : 'border border-[#2d3148] text-[#94a3b8] hover:border-[#22c55e]/40 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}

        <span className="ml-2 text-[#2d3148]">|</span>

        {/* Date range */}
        {(['all', '7d', '30d'] as const).map((dr) => (
          <button
            key={dr}
            type="button"
            onClick={() => onFilterChange({ dateRange: dr })}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filters.dateRange === dr
                ? 'bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/40'
                : 'border border-[#2d3148] text-[#94a3b8] hover:border-[#22c55e]/40 hover:text-white'
            }`}
          >
            {dr === 'all' ? 'All time' : dr === '7d' ? 'Past 7 days' : 'Past 30 days'}
          </button>
        ))}

        <button
          type="button"
          onClick={onClear}
          className="ml-auto text-xs text-[#4a5280] hover:text-[#94a3b8] transition-colors"
        >
          Clear all
        </button>
      </div>
    </div>
  )
}
