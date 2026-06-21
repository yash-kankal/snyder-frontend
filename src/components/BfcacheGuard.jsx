'use client'
import { useEffect } from 'react'

const BUILD_ID = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'dev'

export default function BfcacheGuard() {
  useEffect(() => {
    const stored = sessionStorage.getItem('__cuedup_build')
    if (stored && stored !== BUILD_ID) {
      sessionStorage.setItem('__cuedup_build', BUILD_ID)
      window.location.reload()
      return
    }
    sessionStorage.setItem('__cuedup_build', BUILD_ID)

    const handlePageShow = (e) => {
      if (e.persisted) window.location.reload()
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [])

  return null
}
