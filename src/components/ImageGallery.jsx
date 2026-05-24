'use client'
import { useRef, useCallback, useState, useEffect, memo } from 'react'
import { createPortal } from 'react-dom'

const ImageGallery = memo(function ImageGallery({ images }) {
  const scrollRef = useRef(null)
  const [lightboxIdx, setLightboxIdx] = useState(null)
  const [mounted,     setMounted]     = useState(false)

  const scroll = useCallback((dir) => {
    scrollRef.current?.scrollBy({ left: dir * 620, behavior: 'smooth' })
  }, [])

  const openLightbox = useCallback((i) => setLightboxIdx(i), [])
  const closeLightbox = useCallback(() => setLightboxIdx(null), [])
  const prev = useCallback((e) => { e.stopPropagation(); setLightboxIdx(i => Math.max(0, i - 1)) }, [])
  const next = useCallback((e) => { e.stopPropagation(); setLightboxIdx(i => Math.min(images.length - 1, i + 1)) }, [images.length])

  useEffect(() => { setMounted(true) }, [])

  // Keyboard navigation
  useEffect(() => {
    if (lightboxIdx === null) return
    const onKey = (e) => {
      if (e.key === 'ArrowLeft')  setLightboxIdx(i => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setLightboxIdx(i => Math.min(images.length - 1, i + 1))
      if (e.key === 'Escape')     setLightboxIdx(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxIdx, images.length])

  if (!images || images.length === 0) return null

  const isOpen = lightboxIdx !== null
  const currentImg = isOpen ? images[lightboxIdx] : null

  const navBtnStyle = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(4px)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 10000,
    transition: 'background 0.15s',
  }

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
            <div
              key={img.file_path || i}
              className="ig-card"
              onClick={() => openLightbox(i)}
            >
              <img
                src={`https://image.tmdb.org/t/p/w780${img.file_path}`}
                alt={`Image ${i + 1}`}
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>

      {mounted && isOpen && createPortal(
        <div
          style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.92)', display:'flex', alignItems:'center', justifyContent:'center', padding:'60px 20px' }}
          onClick={closeLightbox}
        >
          {/* X close button */}
          <button
            onClick={e => { e.stopPropagation(); closeLightbox() }}
            style={{ position:'absolute', top:'16px', right:'16px', width:'40px', height:'40px', borderRadius:'50%', border:'none', background:'rgba(255,255,255,0.15)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', zIndex:10000 }}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="18" height="18">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>

          {/* Prev arrow */}
          {lightboxIdx > 0 && (
            <button onClick={prev} style={{ ...navBtnStyle, left: '12px' }} aria-label="Previous image">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
          )}

          {/* Image */}
          <img
            src={`https://image.tmdb.org/t/p/original${currentImg.file_path}`}
            alt={`Image ${lightboxIdx + 1}`}
            style={{ maxHeight:'85vh', maxWidth:'90vw', borderRadius:'10px', objectFit:'contain' }}
            onClick={e => e.stopPropagation()}
          />

          {/* Next arrow */}
          {lightboxIdx < images.length - 1 && (
            <button onClick={next} style={{ ...navBtnStyle, right: '12px' }} aria-label="Next image">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          )}

          {/* Counter */}
          <div style={{ position:'absolute', bottom:'16px', left:'50%', transform:'translateX(-50%)', color:'rgba(255,255,255,0.6)', fontSize:'13px', fontWeight:500, letterSpacing:'0.5px' }}>
            {lightboxIdx + 1} / {images.length}
          </div>
        </div>,
        document.body
      )}
    </>
  )
})

export default ImageGallery
