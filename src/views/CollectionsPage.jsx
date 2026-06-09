'use client'
import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CURATED_COLLECTIONS } from '../data/collections'
import { useRevealOnScroll } from '../lib/useRevealOnScroll'

export default function CollectionsPage() {
  const router = useRouter()

  const gridRef = useRef(null)
  useRevealOnScroll(gridRef, [])

  return (
    <main>


      {/* ── Page header ── */}
      <div className="anime-page-header">
        <div className="anime-page-header-inner">
          <div className="anime-page-title-row">
            <button className="anime-page-back" onClick={() => router.back()} aria-label="Go back">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
            <div>
              <h1 className="anime-page-title">Collections</h1>
            </div>
          </div>
        </div>
      </div>

      {/* ── Collections grid ── */}
      <div className="collections-grid" ref={gridRef}>
        {CURATED_COLLECTIONS.map(collection => (
          <button
            key={collection.slug}
            className="collection-card"
            style={{ background: collection.gradient }}
            onClick={() => router.push(`/collections/${collection.slug}`)}
            aria-label={collection.name}
          >
            <div className="collection-card-overlay" />
            <span className="collection-card-badge">
              {collection.type === 'tv' ? 'TV' : 'Movie'}
            </span>
            <div className="collection-card-body">
              <span className="collection-card-emoji">{collection.emoji}</span>
              <span className="collection-card-name">{collection.name}</span>
              <span className="collection-card-tagline">{collection.tagline}</span>
            </div>
          </button>
        ))}
      </div>
    </main>
  )
}
