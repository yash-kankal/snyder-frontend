'use client'
import { useEffect } from 'react'

/**
 * Forces a reload when Safari restores a page from its back-forward cache
 * (bfcache). Without this, pressing Back in Safari shows a frozen snapshot
 * of the old page even after a new deployment, ignoring Cache-Control headers.
 */
export default function BfcacheGuard() {
  useEffect(() => {
    const handlePageShow = (e) => {
      if (e.persisted) window.location.reload()
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [])

  return null
}
