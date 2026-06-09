'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { getFavorites } from '../lib/movieActions'
import { useRevealOnScroll } from '../lib/useRevealOnScroll'
import { usePageMeta } from '../lib/usePageMeta'
import Card from '../components/Card'
import CardSkeleton from '../components/CardSkeleton'
import Footer from '../components/Footer'

export default function FavouritesPage() {
  usePageMeta('My Favourites', 'All your favourite movies and TV shows in one place.')
  const { user }  = useAuth()
  const router    = useRouter()
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)

  const listRef = useRef(null)
  useRevealOnScroll(listRef, [items, loading])

  useEffect(() => {
    if (!user) { router.replace('/browse?section=movies'); return }
    getFavorites(user.id)
      .then(data => { setItems(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [user, router])

  // Build a Card-compatible movie object from a DB favourite row
  function toMovie(fav) {
    const isTV   = fav.media_type === 'tv'
    const tmdbId = isTV
      ? parseInt(fav.movie_id.replace('tv-', ''), 10)
      : parseInt(fav.movie_id, 10)
    return {
      id:          tmdbId,
      title:       isTV ? undefined : fav.movie_title,
      name:        isTV ? fav.movie_title : undefined,
      poster_path: fav.movie_poster_path,
    }
  }

  return (
    <main>

      <div className="wrapper">
        <section className="all-movies">

          <div className="section-header">
            <h2 className="profile-page-title">
              <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ width: 22, height: 22, color: '#ef4444', flexShrink: 0 }}>
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              My Favourites
              {!loading && <span className="profile-page-count">{items.length}</span>}
            </h2>
          </div>

          {loading ? (
            <ul>{Array.from({ length: 10 }).map((_, i) => <CardSkeleton key={i} />)}</ul>
          ) : items.length === 0 ? (
            <div className="profile-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              <p>No favourites yet</p>
              <span>Tap the ♥ on any movie or show to save it here</span>
            </div>
          ) : (
            <ul ref={listRef}>
              {items.map(fav => (
                <Card
                  key={fav.id}
                  movie={toMovie(fav)}
                  mediaType={fav.media_type || 'movie'}
                />
              ))}
            </ul>
          )}

        </section>
      </div>
      <Footer />
    </main>
  )
}
