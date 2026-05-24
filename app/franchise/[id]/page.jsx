import { Suspense } from 'react'
import FranchisePage from '../../../src/views/FranchisePage'
import { findFranchiseBySlug } from '../../../src/data/franchises'
import { createPageMetadata } from '../../../src/lib/seo'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }) {
  const { id } = await params
  const franchise = findFranchiseBySlug(id)
  const title = franchise?.name ? `${franchise.name} Watch Order` : 'Movie Franchise'
  const description = franchise?.description || franchise?.tagline || 'Explore movie franchise watch orders, release orders, posters, and details on CuedUp.'
  const image = franchise?.backdrop ? `https://image.tmdb.org/t/p/w1280${franchise.backdrop}` : undefined

  return createPageMetadata({
    title,
    description,
    path: `/franchise/${id}`,
    image,
  })
}

export default async function FranchiseRoute({ params }) {
  const { id } = await params
  return <Suspense><FranchisePage routeId={id} /></Suspense>
}
