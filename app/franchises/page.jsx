import { Suspense } from 'react'
import FranchisesListPage from '../../src/views/FranchisesListPage'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Franchises — CuedUp' }

export default function Franchises() {
  return <Suspense><FranchisesListPage /></Suspense>
}
