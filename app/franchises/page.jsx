import { Suspense } from 'react'
import FranchisesListPage from '../../src/views/FranchisesListPage'
import { createPageMetadata } from '../../src/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata = createPageMetadata({
  title: 'Movie Franchises',
  description: 'Explore major movie franchises, sagas, collections, watch order, release order, posters, and details on CuedUp.',
  path: '/franchises',
})

export default function Franchises() {
  return <Suspense><FranchisesListPage /></Suspense>
}
