'use client'
import { useEffect } from 'react'

/**
 * Lenis smooth-scroll, mounted once at the root.
 *
 * Deliberately conservative:
 *  - Desktop + fine-pointer only — native touch scroll feels better on mobile
 *    and avoids the laggy "lerped touch" feel.
 *  - Disabled under prefers-reduced-motion (ties into our a11y pass).
 *  - Scrolls the real window, so native `scroll` events still fire — the
 *    navbar-on-scroll and hero parallax stay fully decoupled from Lenis.
 *
 * The instance is exposed on window.__lenis so the navbar's "scroll to top"
 * can jump instantly through Lenis instead of fighting it.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isTouch = window.matchMedia('(pointer: coarse)').matches
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches
    if (reduced || isTouch || !isDesktop) return

    let lenis
    let rafId
    let cancelled = false

    import('lenis').then(({ default: Lenis }) => {
      if (cancelled) return
      lenis = new Lenis({
        duration: 1.1,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      })
      window.__lenis = lenis

      const raf = (time) => {
        lenis.raf(time)
        rafId = requestAnimationFrame(raf)
      }
      rafId = requestAnimationFrame(raf)
    })

    return () => {
      cancelled = true
      if (rafId) cancelAnimationFrame(rafId)
      if (lenis) { lenis.destroy(); delete window.__lenis }
    }
  }, [])

  return null
}
