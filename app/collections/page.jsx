import { Suspense } from 'react'
import CollectionsPage from '../../src/views/CollectionsPage'
import { createPageMetadata } from '../../src/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata = createPageMetadata({
  title: 'Collections',
  description: 'Curated movie and TV collections on CuedUp — Oscar winners, Emmy drama, and more handpicked lists.',
  path: '/collections',
})

export default function Collections() {
  return (
    <Suspense>
      <CollectionsPage />
    </Suspense>
  )
}
