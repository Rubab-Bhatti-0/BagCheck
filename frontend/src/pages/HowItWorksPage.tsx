import { Link } from 'react-router-dom'
import { ArrowUpRight, CheckCircle2, CornerUpLeft, FilePlus2, Search } from 'lucide-react'

const steps = [
  { icon: Search, title: 'Check the board', text: 'Start by searching for the item or place. Narrow the board by university, campus, category, or date.' },
  { icon: FilePlus2, title: 'Post what happened', text: 'Choose Lost or Found, describe the item, and add the location and date. A photo helps when you have one.' },
  { icon: CornerUpLeft, title: 'Look for a match', text: 'After posting, check for a possible match from the same campus. Mark your report resolved once the item is returned.' },
]

export default function HowItWorksPage() {
  return (
    <main className="page-shell max-w-5xl py-10 sm:py-14">
      <header className="max-w-2xl">
        <h1 className="page-title">How Back2U works</h1>
        <p className="mt-4 max-w-lg text-base leading-7 text-muted">
          Start with the campus board. Search for your item or leave a report so other students know what to look for.
        </p>
      </header>

      <ol className="panel mt-8 divide-y divide-line">
        {steps.map(({ icon: Icon, title, text }, index) => (
          <li key={title} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 px-5 py-6 sm:gap-x-6 sm:px-7">
            <span className="grid size-11 place-items-center rounded-lg bg-found-tint text-accent">
              <Icon size={21} strokeWidth={1.7} aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-2xl leading-tight tracking-tight">{index + 1}. {title}</h2>
              <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted">{text}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-5 flex items-start gap-2 text-sm leading-6 text-muted">
        <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
        Anyone can browse. Sign in to post or manage your reports. Contact emails are kept off the public board.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/browse" className="btn btn-primary">Browse reports <ArrowUpRight size={16} aria-hidden="true" /></Link>
        <Link to="/report" className="btn btn-secondary">Report an item</Link>
      </div>
    </main>
  )
}
