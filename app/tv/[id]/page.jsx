import TVDetails from '../../../src/views/TVDetails'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const SITE_URL  = 'https://cuedup.online'

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
  const desc  = (show.overview || 'Discover this title on CuedUp.').slice(0, 300)
  const image = show.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${show.backdrop_path}`
    : `${SITE_URL}/CuedUpLogo.png`

  return {
    title: `${title} — CuedUp`,
    description: desc,
    openGraph: {
      title: `${title} — CuedUp`,
      description: desc,
      url: `${SITE_URL}/tv/${id}`,
      images: [{ url: image, width: 1280, height: 720 }],
      type: 'video.tv_show',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} — CuedUp`,
      description: desc,
      images: [image],
    },
  }
}

export default async function TVPage({ params }) {
  const { id } = await params
  return <TVDetails routeId={id} />
}
