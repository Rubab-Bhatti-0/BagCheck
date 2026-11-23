import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Loader2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/auth'
import client, { apiErrorMessage } from '../api/client'
import MatchCard from '../components/MatchCard'
import { REPORT_CATEGORIES } from '../data/reportCategories'

interface University { id: number; name: string; short_name: string; campuses: { id: number; name: string; city: string }[] }
interface Match { report_id: number; title: string; description: string; type: string; location: string; event_date: string; score: number }
type ContentStatus = 'idle' | 'checking' | 'relevant' | 'irrelevant' | 'unavailable'

export default function ReportPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [universities, setUniversities] = useState<University[]>([])
  const [step, setStep] = useState<1 | 2>(1)
  const [reportType, setReportType] = useState<'Lost' | 'Found'>('Lost')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [contentStatus, setContentStatus] = useState<ContentStatus>('idle')
  const [contentFeedback, setContentFeedback] = useState('')
  const [category, setCategory] = useState('General')
  const [uniId, setUniId] = useState('')
  const [campusId, setCampusId] = useState('')
  const [location, setLocation] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [editedContactEmail, setContactEmail] = useState<string | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [matches, setMatches] = useState<Match[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [reportId, setReportId] = useState<number | null>(null)
  const [matchChecked, setMatchChecked] = useState(false)
  const [checkingMatches, setCheckingMatches] = useState(false)
  const contactEmail = editedContactEmail ?? user?.email ?? ''

  const campuses = useMemo(() => {
    const uni = universities.find((u) => String(u.id) === uniId)
    return uni ? uni.campuses : []
  }, [uniId, universities])

  useEffect(() => {
    client.get('/api/universities').then(({ data }) => setUniversities(data)).catch(() => toast.error('Could not load universities'))
  }, [])

  useEffect(() => {
    if (!authLoading && !user) navigate('/login?returnTo=/report', { replace: true })
  }, [user, authLoading, navigate])

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null
    setPhoto(file)
    if (file) setPhotoPreview(URL.createObjectURL(file))
    else setPhotoPreview(null)
  }

  async function continueToDetails() {
    if (!title.trim() || !description.trim()) {
      setContentStatus('irrelevant')
      setContentFeedback('This is not a valid lost/found report yet. Enter a title and description about the item.')
      toast.error('This is not a valid lost/found report yet')
      return
    }
    if (title.trim().length < 1 || description.trim().length < 8) {
      setContentStatus('irrelevant')
      setContentFeedback('This is not detailed enough to check. Enter an item title and briefly say where or how it was lost or found.')
      toast.error('Please add a clearer item title and description')
      return
    }

    setContentStatus('checking')
    try {
      const content = new FormData()
      content.append('title', title.trim())
      content.append('description', description.trim())
      if (photo) content.append('photo', photo)
      const { data } = await client.post('/api/reports/check-content', content, { headers: { 'Content-Type': 'multipart/form-data' } })
      setContentFeedback(data.message || '')
      if (data.relevant === false) {
        setContentStatus('irrelevant')
        toast.error(data.message || 'This content is not relevant to a lost/found report')
        return
      }
      if (data.relevant !== true) {
        setContentStatus('unavailable')
        setContentFeedback('The relevance check is unavailable. Please try again shortly.')
        toast.error('The relevance check is unavailable. Please try Next again shortly.')
        return
      }
      setContentStatus('relevant')
      setStep(2)
    } catch (err) {
      setContentStatus('unavailable')
      setContentFeedback('The relevance check failed. Please try again.')
      toast.error(apiErrorMessage(err, 'The content check failed. Please try again.'))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step === 1) {
      await continueToDetails()
      return
    }
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
      if (eventTime) form.append('event_time', eventTime)
      if (contactEmail) form.append('contact_email', contactEmail)
      if (photo) form.append('photo', photo)

      const { data } = await client.post('/api/reports', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      if (data.report.moderation_status === 'Rejected') {
        toast.error('This report was rejected because it does not appear to be a lost/found item.', { duration: 6000 })
        setStep(1)
        setContentStatus('irrelevant')
        setContentFeedback('Describe the item and where it went missing or turned up.')
        return
      }

      setReportId(data.report.id)
      setMatches([])
      setSubmitted(true)
      toast.success('Your report has been posted. You can now check for matches.')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to post report'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleFindMatches() {
    if (!reportId) return
    setCheckingMatches(true)
    try {
      const { data } = await client.post(`/api/reports/${reportId}/match`)
      const found = Array.isArray(data.matches) ? data.matches : []
      setMatches(found)
      setMatchChecked(true)
      if (found.length > 0) toast.success(`${found.length} possible match${found.length > 1 ? 'es' : ''} found`)
      else toast.success('No matching item found yet, so your report has been posted')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Matching is temporarily unavailable. Your report is still posted.'))
    } finally {
      setCheckingMatches(false)
    }
  }

  if (submitted) {
    return (
      <main className="page-shell max-w-2xl py-10 sm:py-14">
        <div className="panel p-6 sm:p-8">
          <CheckCircle2 size={29} className="mb-4 text-accent" aria-hidden="true" />
          <h1 className="page-title">Report posted</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            {matchChecked && matches.length === 0
              ? 'There are no possible matches yet. Your report is visible on the board.'
              : 'Other students can now find your report on the campus board.'}
          </p>
          {!matchChecked && (
            <button type="button" onClick={handleFindMatches} disabled={checkingMatches} className="btn btn-primary mt-5">
              {checkingMatches && <Loader2 className="animate-spin" size={17} aria-hidden="true" />}
              {checkingMatches ? 'Looking for matches…' : 'Find possible matches'}
            </button>
          )}
        </div>

        {matches.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-4 font-display text-2xl">Possible matches</h2>
            <div className="space-y-3">
              {matches.map((match) => <MatchCard key={match.report_id} match={match} onView={(id) => navigate('/items/' + id)} />)}
            </div>
          </section>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={() => navigate('/browse')} className="btn btn-secondary">Browse reports</button>
          <button type="button" onClick={() => navigate('/dashboard')} className="btn btn-secondary">My reports</button>
        </div>
      </main>
    )
  }

  return (
    <main className="page-shell grid max-w-5xl gap-7 py-8 sm:py-12 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
      <div>
        <h1 className="page-title">Report an item</h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-muted">
          Tell students what to look for and where it went missing or turned up.
        </p>
        <ol aria-label="Report progress" className="mt-5 flex flex-wrap gap-2 lg:mt-7 lg:grid">
          {['Item details', 'Campus & contact'].map((label, index) => (
            <li key={label} aria-current={step === index + 1 ? 'step' : undefined}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted aria-[current=step]:bg-found-tint aria-[current=step]:font-semibold aria-[current=step]:text-found">
              <span className="grid size-6 place-items-center rounded-md border border-line bg-panel text-xs font-semibold">{index + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      </div>

      <form onSubmit={handleSubmit} className="panel min-w-0 space-y-5 p-5 sm:p-7">
        {step === 1 ? (
          <>
            <fieldset>
              <legend className="field-label">What happened?</legend>
              <div className="grid grid-cols-2 gap-2">
                {(['Lost', 'Found'] as const).map((option) => (
                  <label key={option} className="flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink has-checked:border-accent has-checked:bg-found-tint">
                    <input type="radio" name="report-type" checked={reportType === option} onChange={() => setReportType(option)} className="accent-accent" />
                    {option === 'Lost' ? 'I lost something' : 'I found something'}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="item-title" className="field-label">Item title</label>
              <input id="item-title" className="field" value={title} onChange={(event) => setTitle(event.target.value)} required placeholder="e.g. Blue earbuds in a black case" />
            </div>
            <div>
              <label htmlFor="item-description" className="field-label">Description</label>
              <textarea id="item-description" className="field min-h-28 resize-y" required rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Include the color, brand, or a detail that would help someone recognize it." />
            </div>

            <div>
              <p className="field-label">Photo <span className="font-normal text-muted">(optional)</span></p>
              <label className="flex min-h-24 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-accent/50 bg-wash px-4 py-3 text-sm text-muted focus-within:outline-2 focus-within:outline-accent">
                {photoPreview ? <img src={photoPreview} alt="Selected item" className="max-h-32 max-w-24 rounded-md object-contain sm:max-w-36" /> : <Upload size={21} className="shrink-0 text-accent" aria-hidden="true" />}
                <span className="min-w-0 break-words">
                  <span className="block font-semibold text-ink">{photo ? 'Change photo' : 'Choose a photo'}</span>
                  <span className="mt-1 block text-xs">{photo ? photo.name : 'JPG, PNG, WEBP, or GIF up to 5 MB'}</span>
                </span>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={handlePhotoChange} />
              </label>
            </div>

            {(contentStatus === 'irrelevant' || contentStatus === 'unavailable') && (
              <p role="alert" className="rounded-lg bg-lost-tint p-3 text-sm leading-6 text-lost">{contentFeedback}</p>
            )}

            <button type="submit" disabled={contentStatus === 'checking'} className="btn btn-primary w-full sm:w-auto">
              {contentStatus === 'checking' && <Loader2 className="animate-spin" size={17} aria-hidden="true" />}
              {contentStatus === 'checking' ? 'Checking details…' : 'Continue to campus details'}
            </button>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-found-tint p-3 text-sm text-found">
              <p className="inline-flex min-w-0 items-center gap-2"><CheckCircle2 size={17} className="shrink-0" aria-hidden="true" /> <span className="break-words font-semibold">{title}</span></p>
              <button type="button" onClick={() => setStep(1)} className="shrink-0 font-medium underline underline-offset-3">Edit item details</button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="min-w-0">
                <span className="field-label">University</span>
                <select className="field" required value={uniId} onChange={(event) => { setUniId(event.target.value); setCampusId('') }}>
                  <option value="">Select university</option>
                  {universities.map((university) => <option key={university.id} value={university.id}>{university.name}</option>)}
                </select>
              </label>
              <label className="min-w-0">
                <span className="field-label">Campus</span>
                <select className="field" required value={campusId} disabled={!uniId} onChange={(event) => setCampusId(event.target.value)}>
                  <option value="">Select campus</option>
                  {campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="field-label">Location on campus</span>
              <input className="field" required value={location} onChange={(event) => setLocation(event.target.value)} placeholder="e.g. Library entrance" />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="min-w-0">
                <span className="field-label">Date</span>
                <input className="field" required type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} />
              </label>
              <label className="min-w-0">
                <span className="field-label">Time</span>
                <input className="field" required type="time" value={eventTime} onChange={(event) => setEventTime(event.target.value)} />
              </label>
            </div>

            <label className="block">
              <span className="field-label">Category</span>
              <select className="field" value={category} onChange={(event) => setCategory(event.target.value)}>
                {REPORT_CATEGORIES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>

            <div>
              <label htmlFor="contact-email" className="field-label">Contact email</label>
              <input id="contact-email" className="field" required type="email" value={contactEmail} aria-describedby="contact-note" onChange={(event) => setContactEmail(event.target.value)} />
              <p id="contact-note" className="mt-1.5 text-xs text-muted">Your email stays hidden from the public board.</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setStep(1)} className="btn btn-secondary">Back</button>
              <button type="submit" disabled={submitting} className="btn btn-primary">
                {submitting ? 'Posting report…' : 'Post report'}
              </button>
            </div>
          </>
        )}
      </form>
    </main>
  )
}
