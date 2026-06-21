'use client'
import { useRef, useCallback, useState, useEffect, memo } from 'react'
import { createPortal } from 'react-dom'

const ImageGallery = memo(function ImageGallery({ images }) {
  const scrollRef = useRef(null)
  const [lightboxIdx, setLightboxIdx] = useState(null)
  const [mounted,     setMounted]     = useState(false)

  const scroll        = useCallback((dir) => { scrollRef.current?.scrollBy({ left: dir * 620, behavior: 'smooth' }) }, [])
  const closeLightbox = useCallback(() => setLightboxIdx(null), [])
  const prev          = useCallback(() => setLightboxIdx(i => (i - 1 + images.length) % images.length), [images.length])
  const next          = useCallback(() => setLightboxIdx(i => (i + 1) % images.length), [images.length])

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (lightboxIdx === null) return
    const onKey = (e) => {
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Escape')     closeLightbox()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxIdx, prev, next, closeLightbox])

  if (!images || images.length === 0) return null

  const isOpen     = lightboxIdx !== null
  const currentImg = isOpen ? images[lightboxIdx] : null

  return (
    <>
      <div className="vg-section detail-card">
        <div className="vg-header">
          <h2 className="vg-title">Images</h2>
          <div className="ep-arrows">
            <button className="ep-arrow" onClick={() => scroll(-1)} aria-label="Scroll left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <button className="ep-arrow" onClick={() => scroll(1)} aria-label="Scroll right">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="vg-scroll ig-scroll" ref={scrollRef}>
          {images.map((img, i) => (
            <div key={img.file_path || i} className="ig-card" onClick={() => setLightboxIdx(i)}>
              <img src={`https://image.tmdb.org/t/p/w780${img.file_path}`} alt={`Image ${i + 1}`} loading="lazy" />
            </div>
          ))}
        </div>
      </div>

      {mounted && isOpen && createPortal(
        <div className="person-lightbox" onClick={closeLightbox}>
          <div className="person-lightbox-modal person-lightbox-modal--wide" onClick={e => e.stopPropagation()}>
            <div className="person-lightbox-body">
              <button className="person-lightbox-arrow" onClick={e => { e.stopPropagation(); prev() }} aria-label="Previous">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <img
                src={`https://image.tmdb.org/t/p/original${currentImg.file_path}`}
                alt={`Image ${lightboxIdx + 1}`}
                className="person-lightbox-img"
                style={{ aspectRatio: currentImg.width && currentImg.height ? `${currentImg.width}/${currentImg.height}` : undefined }}
              />
              <button className="person-lightbox-arrow" onClick={e => { e.stopPropagation(); next() }} aria-label="Next">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
            <span className="person-lightbox-count">{lightboxIdx + 1} / {images.length}</span>
            <button className="person-lightbox-close" onClick={closeLightbox} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
})

export default ImageGallery
