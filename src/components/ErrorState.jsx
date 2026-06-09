import Link from 'next/link'

/**
 * Full-page friendly error state for detail pages that failed to load
 * (dead ID, expired link, network failure). Mirrors the 404 page styling.
 */
export default function ErrorState({ message = "We couldn't load this page." }) {
  return (
    <main className="nf-page">
      <img src="/PopCorn.png" alt="" className="nf-logo" />
      <h1 className="nf-title">Well, this is awkward…</h1>
      <p className="nf-sub">{message}</p>
      <Link href="/browse?section=movies" className="nf-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Back to Browse
      </Link>
    </main>
  )
}
