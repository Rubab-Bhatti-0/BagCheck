import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, ChevronDown, Info, Loader2, Sparkles, Upload, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'
import MatchCard from '../components/MatchCard'

interface University { id: number; name: string; short_name: string; campuses: { id: number; name: string; city: string }[] }
interface Match { report_id: number; title: string; description: string; type: string; location: string; event_date: string; score: number }
type ContentStatus = 'idle' | 'checking' | 'relevant' | 'irrelevant' | 'unavailable'

const CATEGORIES = ['General', 'Electronics', 'Wallets & Keys', 'Student Cards & IDs', 'Books & Notes', 'Clothing', 'Bags', 'Accessories']

export default function ReportPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [universities, setUniversities] = useState<University[]>([])
  const [step, setStep] = useState<1 | 2>(1)
  const [reportType, setReportType] = useState<'Lost' | 'Found'>('Lost')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [contentStatus, setContentStatus] = useState<ContentStatus>('idle')
  const [contentConfidence, setContentConfidence] = useState<number | null>(null)
  const [category, setCategory] = useState('General')
  const [uniId, setUniId] = useState('')
  const [campusId, setCampusId] = useState('')
  const [location, setLocation] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [matches, setMatches] = useState<Match[]>([])
  const [submitted, setSubmitted] = useState(false)

  const campuses = useMemo(() => {
    const uni = universities.find((u) => String(u.id) === uniId)
    return uni ? uni.campuses : []
  }, [uniId, universities])

  useEffect(() => {
    client.get('/api/universities').then(({ data }) => setUniversities(data)).catch(() => toast.error('Could not load universities'))
  }, [])

  useEffect(() => {
    if (!authLoading && !user) navigate('/login')
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (user) setContactEmail(user.email)
  }, [user])

  // Check the text while the user is writing. The backend repeats this check
  // during final submission, so this is guidance and early feedback, not the
  // only moderation gate.
  useEffect(() => {
    const cleanTitle = title.trim()
    const cleanDescription = description.trim()
    if (cleanTitle.length < 5 || cleanDescription.length < 20) {
      setContentStatus('idle')
      setContentConfidence(null)
      return
    }

    setContentStatus('checking')
    const timer = window.setTimeout(async () => {
      try {
        const { data } = await client.post('/api/reports/check-content', {
          title: cleanTitle,
          description: cleanDescription,
        })
        if (data.relevant === false) setContentStatus('irrelevant')
        else if (data.relevant === true) setContentStatus('relevant')
        else setContentStatus('unavailable')
        setContentConfidence(typeof data.confidence === 'number' ? data.confidence : null)
      } catch {
        setContentStatus('unavailable')
        setContentConfidence(null)
      }
    }, 650)

    return () => window.clearTimeout(timer)
  }, [title, description])

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null
    setPhoto(file)
    if (file) setPhotoPreview(URL.createObjectURL(file))
    else setPhotoPreview(null)
  }

  function continueToDetails() {
    if (!title.trim() || !description.trim()) {
      toast.error('Enter a title and description first')
      return
    }
    if (contentStatus === 'irrelevant') {
      toast.error('Please describe a genuine lost or found item before continuing')
      return
    }
    setStep(2)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !description.trim()) {
      toast.error('Title and description are required')
      setStep(1)
      return
    }
    setSubmitting(true)
    try {
      const form = new FormData()
      form.append('type', reportType)
      form.append('title', title.trim())
      form.append('description', description.trim())
      form.append('category', category)
      if (uniId) form.append('university_id', uniId)
      if (campusId) form.append('campus_id', campusId)
      if (location) form.append('location', location)
      if (eventDate) form.append('event_date', eventDate)
      if (contactEmail) form.append('contact_email', contactEmail)
      if (photo) form.append('photo', photo)

      const { data } = await client.post('/api/reports', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      if (data.report.moderation_status === 'Rejected') {
        toast.error('This report was rejected because it does not appear to be a lost/found item.', { duration: 6000 })
        setStep(1)
        setContentStatus('irrelevant')
        return
      }

      setMatches(Array.isArray(data.matches) ? data.matches : [])
      setSubmitted(true)
      if (Array.isArray(data.matches) && data.matches.length > 0) {
        toast.success(`${data.matches.length} possible match${data.matches.length > 1 ? 'es' : ''} found`)
      } else {
        toast.success('No matching item found yet, so your report has been posted')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to post report')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-10">
        <div className={`mb-6 flex items-start gap-3 rounded-2xl border p-5 ${matches.length > 0 ? 'border-[#22c55e]/30 bg-[#22c55e]/10' : 'border-blue-400/30 bg-blue-400/10'}`}>
          {matches.length > 0 ? <Sparkles className="mt-0.5 shrink-0 text-[#22c55e]" size={24} /> : <CheckCircle2 className="mt-0.5 shrink-0 text-blue-300" size={24} />}
          <div>
            <p className={`font-semibold ${matches.length > 0 ? 'text-[#22c55e]' : 'text-blue-200'}`}>
              {matches.length > 0 ? 'Your report is live and possible matches were found' : 'No matching item found yet, so your report has been posted'}
            </p>
            <p className="mt-1 text-sm text-[#94a3b8]">
              {matches.length > 0 ? 'Review the suggested matches below. You can also browse all reports.' : 'Other students can now find your report. We will keep it available for future matching.'}
            </p>
          </div>
        </div>

        {matches.length > 0 && (
          <div className="mb-6 space-y-4">
            {matches.map((match) => <MatchCard key={match.report_id} match={match} onView={(id) => navigate(`/items/${id}`)} />)}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={() => navigate('/browse')} className="flex-1 rounded-xl bg-[#22c55e] py-3 text-sm font-semibold text-white hover:bg-[#16a34a] transition-colors">
            Browse reports
          </button>
          <button onClick={() => navigate('/dashboard')} className="flex-1 rounded-xl border border-[#2d3148] py-3 text-sm text-[#94a3b8] hover:text-white transition-colors">
            My dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <div className="mb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#22c55e]">Step {step} of 2</p>
        <h1 className="mb-1 text-2xl font-bold">Report an Item</h1>
        <p className="text-sm text-[#94a3b8]">First describe the item. We check that it is relevant before you add the campus and contact details.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {step === 1 ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              {(['Lost', 'Found'] as const).map((type) => (
                <button key={type} type="button" onClick={() => setReportType(type)} className={`rounded-2xl border p-4 text-left transition-colors ${reportType === type ? type === 'Lost' ? 'border-[#ef4444] bg-[#ef4444]/10' : 'border-[#22c55e] bg-[#22c55e]/10' : 'border-[#2d3148] bg-[#1a1d2e] hover:border-[#3d4168]'}`}>
                  <p className={`text-sm font-bold ${reportType === type ? type === 'Lost' ? 'text-[#ef4444]' : 'text-[#22c55e]' : 'text-[#94a3b8]'}`}>{type === 'Lost' ? 'I Lost Something' : 'I Found Something'}</p>
                  <p className="mt-1 text-xs text-[#64748b]">{type === 'Lost' ? 'Report a missing item' : 'Report an item you found'}</p>
                </button>
              ))}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">Item Title <span className="text-[#ef4444]">*</span></label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Blue wireless earbuds in black case" className="h-11 w-full rounded-xl border border-[#2d3148] bg-[#1a1d2e] px-4 text-sm text-white placeholder:text-[#4b5563] focus:border-[#22c55e] focus:outline-none" />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">Description <span className="text-[#ef4444]">*</span></label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={5} placeholder="Describe the item, colour, brand, distinguishing marks, and what happened…" className="w-full resize-none rounded-xl border border-[#2d3148] bg-[#1a1d2e] px-4 py-3 text-sm text-white placeholder:text-[#4b5563] focus:border-[#22c55e] focus:outline-none" />
            </div>

            <div className={`rounded-xl border p-4 ${contentStatus === 'irrelevant' ? 'border-red-400/30 bg-red-400/10' : contentStatus === 'relevant' ? 'border-[#22c55e]/30 bg-[#22c55e]/10' : 'border-[#2d3148] bg-[#1a1d2e]'}`}>
              <div className="flex items-start gap-3">
                {contentStatus === 'checking' && <Loader2 className="mt-0.5 shrink-0 animate-spin text-[#f59e0b]" size={18} />}
                {contentStatus === 'relevant' && <CheckCircle2 className="mt-0.5 shrink-0 text-[#22c55e]" size={18} />}
                {contentStatus === 'irrelevant' && <XCircle className="mt-0.5 shrink-0 text-red-300" size={18} />}
                {(contentStatus === 'idle' || contentStatus === 'unavailable') && <Info className="mt-0.5 shrink-0 text-[#94a3b8]" size={18} />}
                <div>
                  <p className="text-sm font-semibold">
                    {contentStatus === 'checking' && 'Checking whether this describes a lost or found item…'}
                    {contentStatus === 'relevant' && `Looks relevant${contentConfidence ? ` (${Math.round(contentConfidence * 100)}% confidence)` : ''}`}
                    {contentStatus === 'irrelevant' && 'This text does not look like a lost or found report'}
                    {contentStatus === 'idle' && 'Live relevance check'}
                    {contentStatus === 'unavailable' && 'Live check unavailable — the server will check again when you post'}
                  </p>
                  <p className="mt-1 text-xs text-[#94a3b8]">
                    {contentStatus === 'irrelevant' ? 'Add item details such as the object, colour, brand, or where it was lost/found.' : 'Enter at least 5 title characters and 20 description characters for an automatic check.'}
                  </p>
                </div>
              </div>
            </div>

            <button type="button" onClick={continueToDetails} disabled={contentStatus === 'checking' || contentStatus === 'irrelevant'} className="w-full rounded-xl bg-[#22c55e] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-50">
              Continue to campus and contact details
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-xl border border-[#22c55e]/30 bg-[#22c55e]/10 p-4">
              <div><p className="text-sm font-semibold text-[#22c55e]">Text checked and ready</p><p className="mt-1 text-xs text-[#94a3b8]">{title}</p></div>
              <button type="button" onClick={() => setStep(1)} className="text-xs text-[#94a3b8] underline hover:text-white">Edit text</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">University</label><div className="relative"><select value={uniId} onChange={(e) => { setUniId(e.target.value); setCampusId('') }} className="h-11 w-full appearance-none rounded-xl border border-[#2d3148] bg-[#1a1d2e] px-3 pr-8 text-sm text-white focus:border-[#22c55e] focus:outline-none"><option value="">Select university</option>{universities.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#4b5563]" size={14} /></div></div>
              <div><label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">Campus</label><div className="relative"><select value={campusId} onChange={(e) => setCampusId(e.target.value)} disabled={!uniId} className="h-11 w-full appearance-none rounded-xl border border-[#2d3148] bg-[#1a1d2e] px-3 pr-8 text-sm text-white focus:border-[#22c55e] focus:outline-none disabled:opacity-40"><option value="">Select campus</option>{campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#4b5563]" size={14} /></div></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">Category</label><div className="relative"><select value={category} onChange={(e) => setCategory(e.target.value)} className="h-11 w-full appearance-none rounded-xl border border-[#2d3148] bg-[#1a1d2e] px-3 pr-8 text-sm text-white focus:border-[#22c55e] focus:outline-none">{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#4b5563]" size={14} /></div></div>
              <div><label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">Date of Incident</label><input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="h-11 w-full rounded-xl border border-[#2d3148] bg-[#1a1d2e] px-4 text-sm text-white focus:border-[#22c55e] focus:outline-none" /></div>
            </div>

            <div><label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">Specific Location on Campus</label><input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Near Central Library / C-Block stairs" className="h-11 w-full rounded-xl border border-[#2d3148] bg-[#1a1d2e] px-4 text-sm text-white placeholder:text-[#4b5563] focus:border-[#22c55e] focus:outline-none" /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">Contact Email</label><input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="h-11 w-full rounded-xl border border-[#2d3148] bg-[#1a1d2e] px-4 text-sm text-white focus:border-[#22c55e] focus:outline-none" /><p className="mt-1 text-xs text-[#4b5563]">Shown only to logged-in users who contact you.</p></div>

            <div><label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">Photo (Optional)</label><label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-[#2d3148] bg-[#1a1d2e] p-6 transition-colors hover:border-[#22c55e]">{photoPreview ? <img src={photoPreview} alt="preview" className="max-h-40 rounded-lg object-contain" /> : <><Upload size={24} className="text-[#4b5563]" /><span className="text-sm text-[#64748b]">Click or drag to upload</span><span className="text-xs text-[#4b5563]">PNG, JPG, WEBP up to 5MB</span></>}<input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} /></label></div>

            <div className="flex gap-3"><button type="button" onClick={() => setStep(1)} className="rounded-xl border border-[#2d3148] px-5 py-3 text-sm text-[#94a3b8] hover:text-white">Back</button><button type="submit" disabled={submitting} className={`flex-1 rounded-xl py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${reportType === 'Lost' ? 'bg-[#ef4444] hover:bg-red-600' : 'bg-[#22c55e] hover:bg-[#16a34a]'}`}>{submitting ? 'Checking matches & posting…' : 'Check matches & post report'}</button></div>
          </>
        )}
      </form>
    </div>
  )
}
