import { Suspense } from 'react'
import PersonPage from '../../../src/views/PersonPage'

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
  const desc  = (person.biography || `Discover ${name}'s movies and TV shows on CuedUp.`).slice(0, 300)
  const image = person.profile_path
    ? `https://image.tmdb.org/t/p/w500${person.profile_path}`
    : 'https://cuedup.online/CuedUpLogo.png'

  return {
    title: `${name} — CuedUp`,
    description: desc,
    openGraph: {
      title: `${name} — CuedUp`,
      description: desc,
      images: [{ url: image }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} — CuedUp`,
      description: desc,
      images: [image],
    },
  }
}

export default async function PersonRoute({ params }) {
  const { id } = await params
  return (
    <Suspense>
      <PersonPage routeId={id} />
    </Suspense>
  )
}
