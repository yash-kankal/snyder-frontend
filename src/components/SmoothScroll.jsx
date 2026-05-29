'use client'
import { useEffect } from 'react'

/**
 * Lenis smooth-scroll, mounted once at the root — active on every route.
 *
 * Deliberately conservative:
 *  - Desktop + fine-pointer only — native touch scroll feels better on mobile.
 *  - Disabled under prefers-reduced-motion (ties into our a11y pass).
 *  - Scrolls the real window, so native `scroll` events still fire — the
 *    navbar-on-scroll and hero parallax stay decoupled from Lenis.
 *
 * Exposed on window.__lenis so scroll-to-top helpers stay in sync.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isTouch = window.matchMedia('(pointer: coarse)').matches
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches
    if (reduced || isTouch || !isDesktop) return

    let lenis
    let rafId
    let ro
    let timer
    let cancelled = false

    import('lenis').then(({ default: Lenis }) => {
      if (cancelled) return
      lenis = new Lenis({
        duration: 1.1,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      })
      window.__lenis = lenis

      const raf = (time) => { lenis.raf(time); rafId = requestAnimationFrame(raf) }
      rafId = requestAnimationFrame(raf)

      // Pages grow after client fetch; recompute bounds once layout settles
      // (debounced so it never fires mid-scroll and causes jitter).
      ro = new ResizeObserver(() => {
        clearTimeout(timer)
        timer = setTimeout(() => lenis?.resize(), 150)
      })
      ro.observe(document.body)
    })

    return () => {
      cancelled = true
      if (rafId) cancelAnimationFrame(rafId)
      if (timer) clearTimeout(timer)
      if (ro) ro.disconnect()
      if (lenis) { lenis.destroy(); delete window.__lenis }
    }
  }, [])

  return null
}
