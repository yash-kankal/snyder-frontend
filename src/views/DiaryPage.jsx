'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { getWatched } from '../lib/movieActions'
import { useRevealOnScroll } from '../lib/useRevealOnScroll'
import { usePageMeta } from '../lib/usePageMeta'
import Card from '../components/Card'
import CardSkeleton from '../components/CardSkeleton'
import Footer from '../components/Footer'

function toMovie(row) {
  const isTV   = row.media_type === 'tv'
  const tmdbId = isTV ? parseInt(row.movie_id.replace('tv-', ''), 10) : parseInt(row.movie_id, 10)
  return {
    id:          tmdbId,
    title:       isTV ? undefined : row.movie_title,
    name:        isTV ? row.movie_title : undefined,
    poster_path: row.movie_poster_path,
  }
}

export default function DiaryPage() {
  usePageMeta('Watch Diary', 'Everything you’ve watched, logged in one place on CuedUp.')
  const { user }  = useAuth()
  const router    = useRouter()
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)

  const listRef = useRef(null)
  useRevealOnScroll(listRef, [items, loading])

  useEffect(() => {
    if (!user) { router.replace('/browse?section=movies'); return }
    getWatched(user.id)
      .then(data => { setItems(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [user, router])

  // Stats — small at-a-glance summary above the grid
  const movieCount = items.filter(r => r.media_type !== 'tv').length
  const tvCount    = items.length - movieCount

  return (
    <main>
      <div className="wrapper">
        <section className="all-movies">

          <div className="section-header">
            <h2 className="profile-page-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22, color: '#4ade80', flexShrink: 0 }}>
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              Watch Diary
              {!loading && <span className="profile-page-count">{items.length}</span>}
            </h2>
          </div>

          {!loading && items.length > 0 && (
            <div className="diary-stats">
              <span><strong>{items.length}</strong> watched</span>
              <span className="diary-stats-dot">·</span>
              <span><strong>{movieCount}</strong> {movieCount === 1 ? 'film' : 'films'}</span>
              <span className="diary-stats-dot">·</span>
              <span><strong>{tvCount}</strong> {tvCount === 1 ? 'show' : 'shows'}</span>
            </div>
          )}

          {loading ? (
            <ul>{Array.from({ length: 10 }).map((_, i) => <CardSkeleton key={i} />)}</ul>
          ) : items.length === 0 ? (
            <div className="profile-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              <p>Your diary is empty</p>
              <span>Tap the eye icon on any movie or show to log it as watched</span>
            </div>
          ) : (
            <ul ref={listRef}>
              {items.map(row => (
                <Card key={row.movie_id} movie={toMovie(row)} mediaType={row.media_type || 'movie'} />
              ))}
            </ul>
          )}

        </section>
      </div>
      <Footer />
    </main>
  )
}
