import { Suspense } from 'react'
import RemindersPage from '../../src/views/RemindersPage'
import { createPageMetadata } from '../../src/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata = createPageMetadata({
  title: 'My Reminders',
  description: 'Your upcoming movie and TV show reminders on CuedUp.',
  path: '/reminders',
  robots: { index: false, follow: false },
})

export default function Reminders() {
  return <Suspense><RemindersPage /></Suspense>
}
