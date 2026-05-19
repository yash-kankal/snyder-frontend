import { Suspense } from 'react'
import RemindersPage from '../../src/views/RemindersPage'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Reminders — CuedUp' }

export default function Reminders() {
  return <Suspense><RemindersPage /></Suspense>
}
