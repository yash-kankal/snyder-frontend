'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { GENRES } from '../data/genres'
import { usePageMeta } from '../lib/usePageMeta'
import Footer from '../components/Footer'

const ICON = {
  action: 'M13 2 3 14h7l-1 8 10-12h-7l1-8Z',
  horror: 'M9 9h.01M15 9h.01M8 13a4 4 0 0 0 8 0',
}

export default function GenresIndexPage() {
  usePageMeta('Browse by Genre', 'Explore movies and TV shows by genre on CuedUp — action, horror, comedy, sci-fi and more.')
  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <main>
      <div className="wrapper" style={{ paddingTop: 'calc(72px + 2rem)', paddingBottom: '3rem' }}>
        <div className="franchises-list-header">
          <h1 className="franchises-list-title">Browse by Genre</h1>
          <p className="franchises-list-sub">{GENRES.length} genres</p>
        </div>

        <div className="genres-grid">
          {GENRES.map(g => (
            <Link key={g.slug} href={`/genre/${g.slug}`} className="genre-chip">
              <span className="genre-chip-name">{g.name}</span>
              <span className="genre-chip-arrow">→</span>
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </main>
  )
}
