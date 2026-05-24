import { Suspense } from 'react'
import SharedPlaylist from '../../../src/views/SharedPlaylist'
import { createPageMetadata } from '../../../src/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata = createPageMetadata({
  title: 'Shared Playlist',
  description: 'Open a shared CuedUp playlist of movies and TV shows.',
  path: '/playlist',
  robots: { index: false, follow: true },
})

export default async function PlaylistRoute({ params }) {
  const { shareToken } = await params
  return <Suspense><SharedPlaylist routeToken={shareToken} /></Suspense>
}
