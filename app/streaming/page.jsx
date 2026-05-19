import { Suspense } from 'react'
import StreamingPage from '../../src/views/StreamingPage'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Streaming — CuedUp',
  description: 'Find what to watch across all your streaming platforms on CuedUp.',
}

export default function Streaming() {
  return <Suspense><StreamingPage /></Suspense>
}
