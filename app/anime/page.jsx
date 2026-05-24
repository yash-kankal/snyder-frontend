import { Suspense } from 'react'
import AnimePage from '../../src/views/AnimePage'
import { createPageMetadata } from '../../src/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata = createPageMetadata({
  title: 'Anime Movies and Shows',
  description: 'Browse popular anime movies and TV shows, discover ratings, posters, trailers, and details on CuedUp.',
  path: '/anime',
})

export default function Anime() {
  return <Suspense><AnimePage /></Suspense>
}
