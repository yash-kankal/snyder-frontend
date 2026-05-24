import { Suspense } from 'react'
import StreamingPage from '../../src/views/StreamingPage'
import { createPageMetadata } from '../../src/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata = createPageMetadata({
  title: 'Streaming Guide',
  description: 'Find what to watch across Netflix, Prime Video, Disney+, JioHotstar, Hulu, Crunchyroll, and more streaming platforms.',
  path: '/streaming',
})

export default function Streaming() {
  return <Suspense><StreamingPage /></Suspense>
}
