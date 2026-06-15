import { Suspense } from 'react'
import GenresIndexPage from '../../src/views/GenresIndexPage'
import { createPageMetadata } from '../../src/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata = createPageMetadata({
  title: 'Browse by Genre',
  description: 'Explore movies and TV shows by genre on CuedUp — action, horror, comedy, sci-fi and more.',
  path: '/genres',
})

export default function Genres() {
  return <Suspense><GenresIndexPage /></Suspense>
}
