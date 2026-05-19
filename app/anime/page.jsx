import { Suspense } from 'react'
import AnimePage from '../../src/views/AnimePage'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Anime — CuedUp' }

export default function Anime() {
  return <Suspense><AnimePage /></Suspense>
}
