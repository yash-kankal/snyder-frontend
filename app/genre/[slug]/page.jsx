import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import GenrePage from '../../../src/views/GenrePage'
import { findGenreBySlug, GENRES } from '../../../src/data/genres'
import { createPageMetadata } from '../../../src/lib/seo'

export const dynamic = 'force-dynamic'

export function generateStaticParams() {
  return GENRES.map(g => ({ slug: g.slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const genre = findGenreBySlug(slug)
  if (!genre) return { title: { absolute: 'CuedUp' } }
  return createPageMetadata({
    title: `${genre.name} Movies & TV Shows`,
    description: genre.blurb,
    path: `/genre/${genre.slug}`,
  })
}

export default async function Genre({ params }) {
  const { slug } = await params
  if (!findGenreBySlug(slug)) notFound()
  return (
    <Suspense>
      <GenrePage routeSlug={slug} />
    </Suspense>
  )
}
