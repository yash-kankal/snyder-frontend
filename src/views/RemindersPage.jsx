'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { getUserReminders, removeReminder, markUnreminded } from '../lib/movieActions'
import { usePageMeta } from '../lib/usePageMeta'
import { useToast } from '../contexts/ToastContext'
import ComingSoonCard from '../components/ComingSoonCard'
import CardSkeleton from '../components/CardSkeleton'
import Footer from '../components/Footer'

export default function RemindersPage() {
  usePageMeta('My Reminders', 'All the upcoming movies and shows you\'ve set a reminder for.')
  const { user }   = useAuth()
  const router     = useRouter()
  const showToast  = useToast()
  const [items, setItems]         = useState([])
  const [reminded, setReminded]   = useState(new Set()) // IDs with active reminder
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (!user) { router.replace('/browse?section=movies'); return }
    getUserReminders(user.id)
      .then(data => {
        setItems(data)
        setReminded(new Set(data.map(r => String(r.movie_id))))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [user, router])

  // Build a ComingSoonCard-compatible item from a DB reminder row
  function toItem(rem) {
    const isTV   = rem.media_type === 'tv'
    const tmdbId = isTV
      ? parseInt(rem.movie_id.replace('tv-', ''), 10)
      : parseInt(rem.movie_id, 10)
    return {
      id:             tmdbId,
      title:          isTV ? undefined : rem.movie_title,
      name:           isTV ? rem.movie_title : undefined,
      poster_path:    rem.movie_poster_path,
      release_date:   isTV ? undefined : rem.release_date,
      first_air_date: isTV ? rem.release_date : undefined,
      original_language: null,
    }
  }

  const handleRemind = useCallback(async (item) => {
    if (!user) return
    const id    = String(item.id)
    const title = item.title || item.name

    // Optimistic remove from list
    setItems(prev => prev.filter(r => {
      const isTV   = r.media_type === 'tv'
      const tmdbId = isTV
        ? parseInt(r.movie_id.replace('tv-', ''), 10)
        : parseInt(r.movie_id, 10)
      return String(tmdbId) !== id
    }))
    setReminded(prev => { const n = new Set(prev); n.delete(id); return n })
    showToast(`Reminder removed for "${title}"`)

    try {
      const movieId = item._rawMovieId || id   // raw DB key
      await removeReminder(user.id, movieId)
      markUnreminded(movieId)
    } catch {
      // revert
      getUserReminders(user.id).then(data => {
        setItems(data)
        setReminded(new Set(data.map(r => String(r.movie_id))))
      })
    }
  }, [user, showToast])

  // Attach raw DB movie_id so the handler can delete the right row
  function toItemWithKey(rem) {
    const item = toItem(rem)
    item._rawMovieId = rem.movie_id
    return item
  }

  return (
    <main>
      <div className="pattern" />
      <div className="wrapper">
        <section className="all-movies">

          <div className="section-header">
            <h2 className="profile-page-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22, color: '#AB8BFF', flexShrink: 0 }}>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              My Reminders
              {!loading && <span className="profile-page-count">{items.length}</span>}
            </h2>
          </div>

          {loading ? (
            <ul>{Array.from({ length: 10 }).map((_, i) => <CardSkeleton key={i} />)}</ul>
          ) : items.length === 0 ? (
            <div className="profile-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <p>No reminders set</p>
              <span>Tap the 🔔 on upcoming titles to get reminded</span>
            </div>
          ) : (
            <ul className="cs-cards-ul">
              {items.map(rem => {
                const item = toItemWithKey(rem)
                return (
                  <ComingSoonCard
                    key={rem.id}
                    item={item}
                    mediaType={rem.media_type || 'movie'}
                    reminded={reminded.has(String(item.id))}
                    onRemind={handleRemind}
                  />
                )
              })}
            </ul>
          )}

        </section>
      </div>
      <Footer />
    </main>
  )
}
