import { Suspense } from 'react'
import CollectionDetailPage from '../../../src/views/CollectionDetailPage'
import { CURATED_COLLECTIONS } from '../../../src/data/collections'
import { createPageMetadata } from '../../../src/lib/seo'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const collection = CURATED_COLLECTIONS.find(c => c.slug === slug)
  if (!collection) return { title: { absolute: 'CuedUp' } }
  return createPageMetadata({
    title: collection.name,
    description: `${collection.name} — ${collection.tagline}. Browse the full collection on CuedUp.`,
    path: `/collections/${slug}`,
  })
}

export default function CollectionDetail() {
  return (
    <Suspense>
      <CollectionDetailPage />
    </Suspense>
  )
}
