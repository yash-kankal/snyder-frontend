import { Suspense } from 'react'
import PeoplePage from '../../src/views/PeoplePage'
import { createPageMetadata } from '../../src/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata = createPageMetadata({
  title: 'Popular People',
  description: 'Browse popular actors, directors, and other film and TV personalities on CuedUp.',
  path: '/people',
})

export default function People() {
  return (
    <Suspense>
      <PeoplePage />
    </Suspense>
  )
}
