// Scroll helpers that stay in sync with Lenis when it's active, and fall back
// to native scroll otherwise so nothing fights.

export function scrollToTop() {
  if (typeof window === 'undefined') return
  // Sync Lenis to 0 so it never animates from a stale target after a route
  // change, and set native scroll for the (mobile / reduced-motion) no-Lenis case.
  if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true })
  else window.scrollTo(0, 0)
}

export function scrollToElement(el, offset = -80) {
  if (!el) return
  if (window.__lenis) window.__lenis.scrollTo(el, { offset })
  else el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
