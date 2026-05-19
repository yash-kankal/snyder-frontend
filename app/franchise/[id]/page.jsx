import { Suspense } from 'react'
import FranchisePage from '../../../src/views/FranchisePage'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Franchise — CuedUp' }

export default async function FranchiseRoute({ params }) {
  const { id } = await params
  return <Suspense><FranchisePage routeId={id} /></Suspense>
}
