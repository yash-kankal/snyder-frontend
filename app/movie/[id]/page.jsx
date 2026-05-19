import MovieDetails from '../../../src/views/MovieDetails'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const SITE_URL  = 'https://cuedup.online'

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
  const desc  = (movie.overview || 'Discover this title on CuedUp.').slice(0, 300)
  const image = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
    : `${SITE_URL}/CuedUpLogo.png`

  return {
    title: `${title} — CuedUp`,
    description: desc,
    openGraph: {
      title: `${title} — CuedUp`,
      description: desc,
      url: `${SITE_URL}/movie/${id}`,
      images: [{ url: image, width: 1280, height: 720 }],
      type: 'video.movie',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} — CuedUp`,
      description: desc,
      images: [image],
    },
  }
}

export default async function MoviePage({ params }) {
  const { id } = await params
  return <MovieDetails routeId={id} />
}
