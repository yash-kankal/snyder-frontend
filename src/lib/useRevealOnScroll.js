'use client'
import { useEffect } from 'react'

/**
 * Reveals a container's direct children as they scroll into view.
 *
 * No-JS safe: the hiding styles live under `.reveal-grid`, which this hook
 * only adds on the client after mount — so server HTML shows every card.
 * Skips entirely under prefers-reduced-motion.
 *
 * @param {React.RefObject} ref  container whose children should reveal
 * @param {Array} deps           re-run when the children change (page, tab, …)
 */
export function useRevealOnScroll(ref, deps = []) {
  useEffect(() => {
    const root = ref.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.classList.remove('reveal-grid')
      return
    }

    root.classList.add('reveal-grid')
    const items = Array.from(root.children)
    items.forEach((el) => el.classList.remove('reveal-in'))

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('reveal-in')
            io.unobserve(e.target)
          }
        })
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.08 }
    )
    items.forEach((el) => io.observe(el))
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
