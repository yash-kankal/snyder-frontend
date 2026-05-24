import MovieDetails from '../../../src/views/MovieDetails'
import { createPageMetadata, SITE_URL } from '../../../src/lib/seo'

const TMDB_BASE = 'https://api.themoviedb.org/3'

async function getMovie(id) {
  try {
    const res = await fetch(`${TMDB_BASE}/movie/${id}`, {
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_API_TOKEN}` },
      next: { revalidate: 3600 },
    })
    return res.ok ? res.json() : null
  } catch { return null }
}

export async function generateMetadata({ params }) {
  const { id } = await params
  const movie = await getMovie(id)
  if (!movie) return { title: 'CuedUp' }

  const title = movie.title || 'CuedUp'
  const desc  = movie.overview || `Discover ${title}, including ratings, trailers, cast, streaming availability, and recommendations on CuedUp.`
  const image = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
    : `${SITE_URL}/CuedUpLogo.png`

  return createPageMetadata({
    title,
    description: desc,
    path: `/movie/${id}`,
    image,
    type: 'video.movie',
  })
}

export default async function MoviePage({ params }) {
  const { id } = await params
  return <MovieDetails routeId={id} />
}
