import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Eye, FileSearch, LockKeyhole, MessageCircle, Search, ShieldCheck } from 'lucide-react'

const steps = [
  { icon: FileSearch, title: 'Describe the item', text: 'Choose Lost or Found, then add a clear item title, description, and optional photo.' },
  { icon: ShieldCheck, title: 'Pass the relevance check', text: 'BagCheck checks the title and description before asking for campus details, so unrelated posts are stopped early.' },
  { icon: Search, title: 'Add where and when', text: 'Select the university and campus, then add the incident date, time, location, category, and contact email.' },
  { icon: MessageCircle, title: 'Post and find matches', text: 'Your report is posted first. Click Find possible matches to compare it with opposite Lost or Found reports on the same campus.' },
]

export default function HowItWorksPage() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <section className="rounded-3xl border border-[#2d3148] bg-[#1a1d2e] p-7 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#22c55e]">BagCheck guide</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">How BagCheck works</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[#94a3b8]">A simple, campus-specific way to report missing items, help return things you find, and discover possible matches.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/report" className="inline-flex items-center gap-2 rounded-xl bg-[#22c55e] px-5 py-3 text-sm font-semibold text-white hover:bg-[#16a34a]">Report an item <ArrowRight size={16} /></Link>
          <Link to="/browse" className="rounded-xl border border-[#2d3148] px-5 py-3 text-sm font-semibold text-[#cbd5e1] hover:border-[#22c55e] hover:text-white">Browse reports</Link>
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {steps.map(({ icon: Icon, title, text }, index) => (
          <article key={title} className="rounded-2xl border border-[#2d3148] bg-[#1a1d2e] p-6">
            <div className="flex items-start gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#22c55e]/15 text-[#22c55e]"><Icon size={20} /></span><div><p className="text-xs font-semibold uppercase tracking-widest text-[#64748b]">Step {index + 1}</p><h2 className="mt-1 text-lg font-bold">{title}</h2></div></div>
            <p className="mt-4 text-sm leading-6 text-[#94a3b8]">{text}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#2d3148] bg-[#13162a] p-5"><Eye className="text-[#22c55e]" size={20} /><h2 className="mt-3 font-semibold">Public details</h2><p className="mt-2 text-sm leading-6 text-[#94a3b8]">Everyone can browse approved active reports without an account.</p></div>
        <div className="rounded-2xl border border-[#2d3148] bg-[#13162a] p-5"><LockKeyhole className="text-[#22c55e]" size={20} /><h2 className="mt-3 font-semibold">Protected contact</h2><p className="mt-2 text-sm leading-6 text-[#94a3b8]">Contact information stays hidden until a visitor logs in.</p></div>
        <div className="rounded-2xl border border-[#2d3148] bg-[#13162a] p-5"><CheckCircle2 className="text-[#22c55e]" size={20} /><h2 className="mt-3 font-semibold">Resolve the report</h2><p className="mt-2 text-sm leading-6 text-[#94a3b8]">The owner can mark an item resolved when it has been returned.</p></div>
      </section>
    </main>
  )
}
