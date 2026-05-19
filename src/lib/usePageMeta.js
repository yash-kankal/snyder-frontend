import { useEffect } from 'react'

const SITE_NAME = 'CuedUp'
const DEFAULT_DESC  = 'Discover movies, TV shows, people and more on CuedUp.'
const DEFAULT_IMAGE = '/CuedUpLogo.png'

function setMeta(selector, attr, value) {
  let el = document.querySelector(selector)
  if (!el) {
    const [type, key] = selector.includes('property')
      ? ['meta', 'property']
      : ['meta', 'name']
    el = document.createElement(type)
    el.setAttribute(key, selector.match(/"([^"]+)"/)?.[1] ?? '')
    document.head.appendChild(el)
  }
  el.setAttribute(attr, value)
}

function setCanonical(url) {
  let el = document.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', url)
}

/**
 * Sets the browser tab title, canonical URL, description, and
 * OG / Twitter card meta tags for every page.
 *
 * @param {string}  title        — page-specific title (no site suffix needed)
 * @param {string}  [description]
 * @param {string}  [image]      — absolute URL or root-relative path
 */
export function usePageMeta(title, description, image) {
  useEffect(() => {
    const fullTitle = title ? `${title} - ${SITE_NAME}` : SITE_NAME
    const desc  = description || DEFAULT_DESC
    const img   = image       || DEFAULT_IMAGE
    const url   = window.location.href

    document.title = fullTitle

    // Canonical — tells Google the authoritative URL for this page
    setCanonical(url)

    // Standard description (used by Google for search snippets)
    setMeta('meta[name="description"]', 'content', desc)

    // Open Graph
    setMeta('meta[property="og:title"]',       'content', fullTitle)
    setMeta('meta[property="og:description"]', 'content', desc)
    setMeta('meta[property="og:image"]',       'content', img)
    setMeta('meta[property="og:url"]',         'content', url)
    setMeta('meta[property="og:site_name"]',   'content', SITE_NAME)
    setMeta('meta[property="og:type"]',        'content', 'website')

    // Twitter / X card
    setMeta('meta[name="twitter:card"]',        'content', 'summary_large_image')
    setMeta('meta[name="twitter:title"]',       'content', fullTitle)
    setMeta('meta[name="twitter:description"]', 'content', desc)
    setMeta('meta[name="twitter:image"]',       'content', img)

    return () => { document.title = SITE_NAME }
  }, [title, description, image])
}
