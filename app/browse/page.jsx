import { Suspense } from 'react'
import BrowsePage from '../../src/views/BrowsePage'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'CuedUp — Browse',
}

export default function Browse() {
  return (
    <Suspense>
      <BrowsePage />
    </Suspense>
  )
}
