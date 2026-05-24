import { Suspense } from 'react'
import PersonPage from '../../../src/views/PersonPage'
import { createPageMetadata, SITE_URL } from '../../../src/lib/seo'

const TMDB_BASE = 'https://api.themoviedb.org/3'

async function getPerson(id) {
  try {
    const res = await fetch(`${TMDB_BASE}/person/${id}`, {
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_API_TOKEN}` },
      next: { revalidate: 3600 },
    })
    return res.ok ? res.json() : null
  } catch { return null }
}

export async function generateMetadata({ params }) {
  const { id } = await params
  const person = await getPerson(id)
  if (!person) return { title: 'CuedUp' }

  const name  = person.name || 'Person'
  const desc  = person.biography || `Discover ${name}'s movies and TV shows, biography, known credits, and filmography on CuedUp.`
  const image = person.profile_path
    ? `https://image.tmdb.org/t/p/w500${person.profile_path}`
    : `${SITE_URL}/CuedUpLogo.png`

  return createPageMetadata({
    title: name,
    description: desc,
    path: `/person/${id}`,
    image,
    type: 'profile',
  })
}

export default async function PersonRoute({ params }) {
  const { id } = await params
  return (
    <Suspense>
      <PersonPage routeId={id} />
    </Suspense>
  )
}
