export const SITE_URL = 'https://cuedup.online'
export const SITE_NAME = 'CuedUp'
export const DEFAULT_DESCRIPTION = 'Discover movies, TV shows, actors, franchises, streaming availability, ratings, trailers, and recommendations on CuedUp.'
export const DEFAULT_IMAGE = `${SITE_URL}/CuedUpLogo.png`

export function absoluteUrl(path = '/') {
  if (/^https?:\/\//i.test(path)) return path
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export function pageTitle(title) {
  return title ? `${title} - ${SITE_NAME}` : SITE_NAME
}

export function truncateDescription(text, fallback = DEFAULT_DESCRIPTION) {
  const clean = (text || fallback).replace(/\s+/g, ' ').trim()
  return clean.length > 160 ? `${clean.slice(0, 157).trim()}...` : clean
}

const IMG = (size, path) => path ? `https://image.tmdb.org/t/p/${size}${path}` : undefined

function ratingBlock(voteAverage, voteCount) {
  if (!voteAverage || voteAverage <= 0) return {}
  return {
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: voteAverage.toFixed(1),
      bestRating: '10',
      worstRating: '1',
      ratingCount: voteCount,
    },
  }
}

const personRef = (c) => ({ '@type': 'Person', name: c.name, url: `${SITE_URL}/person/${c.id}` })

/** schema.org Movie — server-renderable so crawlers see it without running JS. */
export function buildMovieJsonLd(movie) {
  if (!movie) return null
  const credits = movie.credits || {}
  return {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: movie.title,
    description: movie.overview || undefined,
    image: IMG('w500', movie.poster_path),
    datePublished: movie.release_date || undefined,
    url: `${SITE_URL}/movie/${movie.id}`,
    director: (credits.crew || []).filter(c => c.job === 'Director').map(personRef),
    actor: (credits.cast || []).slice(0, 10).map(personRef),
    ...ratingBlock(movie.vote_average, movie.vote_count),
  }
}

/** schema.org TVSeries. */
export function buildTVJsonLd(show) {
  if (!show) return null
  const credits = show.credits || {}
  return {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    name: show.name,
    description: show.overview || undefined,
    image: IMG('w500', show.poster_path),
    datePublished: show.first_air_date || undefined,
    url: `${SITE_URL}/tv/${show.id}`,
    actor: (credits.cast || []).slice(0, 10).map(personRef),
    ...ratingBlock(show.vote_average, show.vote_count),
  }
}

/** schema.org Person. */
export function buildPersonJsonLd(person) {
  if (!person) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    description: person.biography || undefined,
    image: IMG('w342', person.profile_path),
    birthDate: person.birthday || undefined,
    birthPlace: person.place_of_birth || undefined,
    jobTitle: person.known_for_department || undefined,
    url: `${SITE_URL}/person/${person.id}`,
  }
}

export function createPageMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  image = DEFAULT_IMAGE,
  type = 'website',
  robots,
} = {}) {
  const fullTitle = pageTitle(title)
  const desc = truncateDescription(description)
  const url = absoluteUrl(path)
  const imageUrl = absoluteUrl(image)

  return {
    title: title || SITE_NAME,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description: desc,
      url,
      siteName: SITE_NAME,
      type,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: desc,
      images: [imageUrl],
    },
    ...(robots ? { robots } : {}),
  }
}
