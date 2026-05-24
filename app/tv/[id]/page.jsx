import TVDetails from '../../../src/views/TVDetails'
import { createPageMetadata, SITE_URL } from '../../../src/lib/seo'

const TMDB_BASE = 'https://api.themoviedb.org/3'

async function getShow(id) {
  try {
    const res = await fetch(`${TMDB_BASE}/tv/${id}`, {
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_API_TOKEN}` },
      next: { revalidate: 3600 },
    })
    return res.ok ? res.json() : null
  } catch { return null }
}

export async function generateMetadata({ params }) {
  const { id } = await params
  const show = await getShow(id)
  if (!show) return { title: 'CuedUp' }

  const title = show.name || 'CuedUp'
  const desc  = show.overview || `Discover ${title}, including ratings, trailers, cast, streaming availability, and recommendations on CuedUp.`
  const image = show.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${show.backdrop_path}`
    : `${SITE_URL}/CuedUpLogo.png`

  return createPageMetadata({
    title,
    description: desc,
    path: `/tv/${id}`,
    image,
    type: 'video.tv_show',
  })
}

export default async function TVPage({ params }) {
  const { id } = await params
  return <TVDetails routeId={id} />
}
