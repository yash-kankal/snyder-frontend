'use client'
import { useRef, useCallback, useState, memo } from 'react'

const ImageGallery = memo(function ImageGallery({ images }) {
  const scrollRef = useRef(null)
  const [lightbox, setLightbox] = useState(null)

  const scroll = useCallback((dir) => {
    scrollRef.current?.scrollBy({ left: dir * 620, behavior: 'smooth' })
  }, [])

  if (!images || images.length === 0) return null

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
              onClick={() => setLightbox(`https://image.tmdb.org/t/p/original${img.file_path}`)}
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

      {lightbox && (
        <div
          style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.92)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={e => { e.stopPropagation(); setLightbox(null) }}
            style={{ position:'absolute', top:'16px', right:'16px', width:'40px', height:'40px', borderRadius:'50%', border:'none', background:'rgba(255,255,255,0.15)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', zIndex:10000 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="18" height="18">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
          <img
            src={lightbox}
            alt="Full size"
            style={{ maxHeight:'90vh', maxWidth:'95vw', borderRadius:'10px', objectFit:'contain' }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
})

export default ImageGallery
