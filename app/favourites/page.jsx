import { Suspense } from 'react'
import FavouritesPage from '../../src/views/FavouritesPage'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Favourites — CuedUp' }

export default function Favourites() {
  return <Suspense><FavouritesPage /></Suspense>
}
