import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Upload, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'
import MatchCard from '../components/MatchCard'

interface University { id: number; name: string; short_name: string; campuses: { id: number; name: string; city: string }[] }
interface Match { report_id: number; title: string; description: string; type: string; location: string; event_date: string; score: number }

const CATEGORIES = ['General', 'Electronics', 'Wallets & Keys', 'Student Cards & IDs', 'Books & Notes', 'Clothing', 'Bags', 'Accessories']

export default function ReportPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [universities, setUniversities] = useState<University[]>([])
  const [reportType, setReportType]     = useState<'Lost' | 'Found'>('Lost')
  const [title, setTitle]               = useState('')
  const [description, setDescription]   = useState('')
  const [category, setCategory]         = useState('General')
  const [uniId, setUniId]               = useState('')
  const [campusId, setCampusId]         = useState('')
  const [location, setLocation]         = useState('')
  const [eventDate, setEventDate]       = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [photo, setPhoto]               = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting]     = useState(false)
  const [matches, setMatches]           = useState<Match[]>([])
  const [submitted, setSubmitted]       = useState(false)

  const campuses = useMemo(() => {
    const uni = universities.find((u) => String(u.id) === uniId)
    return uni ? uni.campuses : []
  }, [uniId, universities])

  useEffect(() => { client.get('/api/universities').then(({ data }) => setUniversities(data)) }, [])
  useEffect(() => { if (!authLoading && !user) navigate('/login') }, [user, authLoading, navigate])
  useEffect(() => { if (user) setContactEmail(user.email) }, [user])

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null
    setPhoto(file)
    if (file) setPhotoPreview(URL.createObjectURL(file))
    else setPhotoPreview(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !description.trim()) { toast.error('Title and description are required'); return }
    setSubmitting(true)
    try {
      const form = new FormData()
      form.append('type', reportType)
      form.append('title', title.trim())
      form.append('description', description.trim())
      form.append('category', category)
      if (uniId)        form.append('university_id', uniId)
      if (campusId)     form.append('campus_id', campusId)
      if (location)     form.append('location', location)
      if (eventDate)    form.append('event_date', eventDate)
      if (contactEmail) form.append('contact_email', contactEmail)
      if (photo)        form.append('photo', photo)

      const { data } = await client.post('/api/reports', form, { headers: { 'Content-Type': 'multipart/form-data' } })

      if (data.report.moderation_status === 'Rejected') {
        toast.error('Your post was rejected — it does not appear to be a lost/found item.', { duration: 6000 })
        setSubmitting(false)
        return
      }

      setSubmitted(true)
      const matchList = Array.isArray(data.matches) ? data.matches : []
      setMatches(matchList)

      if (matchList.length > 0) {
        toast.success(`Posted! ${matchList.length} potential match${matchList.length > 1 ? 'es' : ''} found 🎉`, { duration: 5000 })
      } else {
        toast.success('Report posted successfully!')
        setTimeout(() => navigate('/browse'), 1500)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to post report')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted && matches.length > 0) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-10">
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-[#22c55e]/30 bg-[#22c55e]/10 p-5">
          <Sparkles className="text-[#22c55e] shrink-0" size={24} />
          <div>
            <p className="font-semibold text-[#22c55e]">Your report is live!</p>
            <p className="text-sm text-[#94a3b8]">We found {matches.length} potential match{matches.length > 1 ? 'es' : ''} on the same campus. Check them out:</p>
          </div>
        </div>
        <div className="space-y-4 mb-6">
          {matches.map((m) => <MatchCard key={m.report_id} match={m} onView={(id) => navigate(`/items/${id}`)} />)}
        </div>
        <button onClick={() => navigate('/browse')} className="w-full rounded-xl border border-[#2d3148] py-3 text-sm text-[#94a3b8] hover:text-white transition-colors">
          Browse all reports
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="mb-1 text-2xl font-bold">Report an Item</h1>
      <p className="mb-6 text-sm text-[#94a3b8]">Fill in the details. Our AI will check for matches automatically.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Report type */}
        <div className="grid grid-cols-2 gap-3">
          {(['Lost', 'Found'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setReportType(t)}
              className={`rounded-2xl border p-4 text-left transition-colors ${reportType === t
                ? t === 'Lost' ? 'border-[#ef4444] bg-[#ef4444]/10' : 'border-[#22c55e] bg-[#22c55e]/10'
                : 'border-[#2d3148] bg-[#1a1d2e] hover:border-[#3d4168]'
              }`}>
              <p className={`text-sm font-bold ${reportType === t ? (t === 'Lost' ? 'text-[#ef4444]' : 'text-[#22c55e]') : 'text-[#94a3b8]'}`}>
                {t === 'Lost' ? '😟 I Lost Something' : '😊 I Found Something'}
              </p>
              <p className="mt-1 text-xs text-[#64748b]">{t === 'Lost' ? 'Report a missing item' : 'Report an item you found'}</p>
            </button>
          ))}
        </div>

        {/* University + Campus */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">University</label>
            <div className="relative">
              <select value={uniId} onChange={(e) => { setUniId(e.target.value); setCampusId('') }}
                className="h-11 w-full appearance-none rounded-xl border border-[#2d3148] bg-[#1a1d2e] px-3 pr-8 text-sm text-white focus:border-[#22c55e] focus:outline-none">
                <option value="">Select university</option>
                {universities.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#4b5563]" size={14} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">Campus</label>
            <div className="relative">
              <select value={campusId} onChange={(e) => setCampusId(e.target.value)} disabled={!uniId}
                className="h-11 w-full appearance-none rounded-xl border border-[#2d3148] bg-[#1a1d2e] px-3 pr-8 text-sm text-white focus:border-[#22c55e] focus:outline-none disabled:opacity-40">
                <option value="">Select campus</option>
                {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#4b5563]" size={14} />
            </div>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">Item Title <span className="text-[#ef4444]">*</span></label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Blue wireless earbuds in black case"
            className="h-11 w-full rounded-xl border border-[#2d3148] bg-[#1a1d2e] px-4 text-sm text-white placeholder:text-[#4b5563] focus:border-[#22c55e] focus:outline-none" />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">Description <span className="text-[#ef4444]">*</span></label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={4}
            placeholder="Describe the item in detail — colour, brand, distinguishing marks, where/when you lost/found it…"
            className="w-full rounded-xl border border-[#2d3148] bg-[#1a1d2e] px-4 py-3 text-sm text-white placeholder:text-[#4b5563] focus:border-[#22c55e] focus:outline-none resize-none" />
        </div>

        {/* Category + Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">Category</label>
            <div className="relative">
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="h-11 w-full appearance-none rounded-xl border border-[#2d3148] bg-[#1a1d2e] px-3 pr-8 text-sm text-white focus:border-[#22c55e] focus:outline-none">
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#4b5563]" size={14} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">Date of Incident</label>
            <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)}
              className="h-11 w-full rounded-xl border border-[#2d3148] bg-[#1a1d2e] px-4 text-sm text-white focus:border-[#22c55e] focus:outline-none" />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">Specific Location on Campus</label>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Near Central Library / C-Block stairs"
            className="h-11 w-full rounded-xl border border-[#2d3148] bg-[#1a1d2e] px-4 text-sm text-white placeholder:text-[#4b5563] focus:border-[#22c55e] focus:outline-none" />
        </div>

        {/* Contact email */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">Contact Email</label>
          <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
            className="h-11 w-full rounded-xl border border-[#2d3148] bg-[#1a1d2e] px-4 text-sm text-white focus:border-[#22c55e] focus:outline-none" />
          <p className="mt-1 text-xs text-[#4b5563]">Shown only to logged-in users who contact you.</p>
        </div>

        {/* Photo */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">Photo (Optional)</label>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-[#2d3148] bg-[#1a1d2e] p-6 hover:border-[#22c55e] transition-colors">
            {photoPreview ? (
              <img src={photoPreview} alt="preview" className="max-h-40 rounded-lg object-contain" />
            ) : (
              <>
                <Upload size={24} className="text-[#4b5563]" />
                <span className="text-sm text-[#64748b]">Click or drag to upload</span>
                <span className="text-xs text-[#4b5563]">PNG, JPG, WEBP up to 5MB</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </label>
        </div>

        <button type="submit" disabled={submitting}
          className={`w-full rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-50 ${reportType === 'Lost' ? 'bg-[#ef4444] hover:bg-red-600' : 'bg-[#22c55e] hover:bg-[#16a34a]'} text-white`}>
          {submitting ? 'Checking matches & posting…' : '✨ Check Possible Matches & Post'}
        </button>
      </form>
    </div>
  )
}
