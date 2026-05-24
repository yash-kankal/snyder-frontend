import { Suspense } from 'react'
import BrowsePage from '../../src/views/BrowsePage'
import { createPageMetadata } from '../../src/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata = createPageMetadata({
  title: 'Browse Movies and TV Shows',
  description: 'Browse movies and TV shows by popularity, streaming platform, genre, language, release date, and audience ratings.',
  path: '/browse',
})

export default function Browse() {
  return (
    <Suspense>
      <BrowsePage />
    </Suspense>
  )
}
