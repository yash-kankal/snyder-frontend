'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export default function PosterLightbox({ src, alt, onClose }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  if (!mounted) return null

  return createPortal(
    <div className="poster-lightbox-backdrop" onClick={onClose}>
      <button className="poster-lightbox-close" onClick={onClose} aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      </button>
      <img
        src={src}
        alt={alt}
        className="poster-lightbox-img"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  )
}
