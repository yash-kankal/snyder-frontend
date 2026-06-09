import Link from 'next/link'

export const metadata = { title: 'Page Not Found' }

export default function NotFound() {
  return (
    <main className="nf-page">
      <img src="/PopCorn.png" alt="" className="nf-logo" />
      <p className="nf-code">404</p>
      <h1 className="nf-title">This one&apos;s not in our catalogue</h1>
      <p className="nf-sub">
        The page you&apos;re looking for doesn&apos;t exist, or the link has expired.
      </p>
      <Link href="/browse?section=movies" className="nf-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Back to Browse
      </Link>
    </main>
  )
}
