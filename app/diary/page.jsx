import { Suspense } from 'react'
import DiaryPage from '../../src/views/DiaryPage'
import { createPageMetadata } from '../../src/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata = createPageMetadata({
  title: 'Watch Diary',
  description: 'Everything you’ve watched, logged in one place on CuedUp.',
  path: '/diary',
  robots: { index: false, follow: false },
})

export default function Diary() {
  return <Suspense><DiaryPage /></Suspense>
}
