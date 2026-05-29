import { Suspense } from 'react'
import CompanyPage from '../../../src/views/CompanyPage'
import { createPageMetadata } from '../../../src/lib/seo'

export const dynamic = 'force-dynamic'

const TMDB_BASE = 'https://api.themoviedb.org/3'

async function getCompany(id) {
  try {
    const res = await fetch(`${TMDB_BASE}/company/${id}`, {
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_API_TOKEN}` },
      next: { revalidate: 86400 },
    })
    return res.ok ? res.json() : null
  } catch { return null }
}

export async function generateMetadata({ params }) {
  const { id } = await params
  const company = await getCompany(id)
  const name = company?.name || 'Production Company'
  return createPageMetadata({
    title: `${name} — Movies & TV Shows`,
    description: `Browse every movie and TV show produced by ${name} on CuedUp.`,
    path: `/company/${id}`,
  })
}

export default async function Company({ params }) {
  const { id } = await params
  return (
    <Suspense>
      <CompanyPage routeId={id} />
    </Suspense>
  )
}
