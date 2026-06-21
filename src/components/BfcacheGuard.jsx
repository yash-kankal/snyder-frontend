'use client'
import { useEffect } from 'react'

const CLIENT_BUILD = process.env.NEXT_PUBLIC_BUILD_TIME || 'dev'

export default function BfcacheGuard() {
  useEffect(() => {
    // Fetch the server's current build time and compare to the build time
    // baked into THIS JS bundle. If they differ, a new version was deployed
    // while the browser was serving old cached HTML + old JS — force a reload
    // so the user gets the new version without needing to hard-refresh.
    if (CLIENT_BUILD !== 'dev') {
      fetch('/api/version', { cache: 'no-store' })
        .then(r => r.json())
        .then(({ buildTime }) => {
          if (buildTime && buildTime !== CLIENT_BUILD) {
            window.location.reload()
          }
        })
        .catch(() => {})
    }

    const handlePageShow = (e) => {
      if (e.persisted) window.location.reload()
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [])

  return null
}
