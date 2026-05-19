import { Suspense } from 'react'
import SharedPlaylist from '../../../src/views/SharedPlaylist'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Shared Playlist — CuedUp' }

export default async function PlaylistRoute({ params }) {
  const { shareToken } = await params
  return <Suspense><SharedPlaylist routeToken={shareToken} /></Suspense>
}
