import { Suspense } from 'react'
import FavouritesPage from '../../src/views/FavouritesPage'
import { createPageMetadata } from '../../src/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata = createPageMetadata({
  title: 'My Favourites',
  description: 'Your saved favourite movies and TV shows on CuedUp.',
  path: '/favourites',
  robots: { index: false, follow: false },
})

export default function Favourites() {
  return <Suspense><FavouritesPage /></Suspense>
}
