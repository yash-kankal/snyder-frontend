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
