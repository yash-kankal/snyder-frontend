'use client'
import { useState, useEffect, useCallback } from 'react'
import { API_BASE_URL, API_OPTIONS } from '../config'
import { cachedFetch, TTL } from '../lib/apiCache'
import { usePageMeta } from '../lib/usePageMeta'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import { getUserReminderIds, addReminder, removeReminder } from '../lib/movieActions'
import ComingSoonCard from '../components/ComingSoonCard'
import CardSkeleton from '../components/CardSkeleton'
import Footer from '../components/Footer'

// ── localStorage fallback for logged-out users ────────────────────
const LS_KEY = 'cuedup_reminders'
function getLsReminders() {
  try { return new Set(JSON.parse(localStorage.getItem(LS_KEY) || '[]')) }
  catch { return new Set() }
}
function saveLsReminders(set) {
  localStorage.setItem(LS_KEY, JSON.stringify([...set]))
}

// ── Page ──────────────────────────────────────────────────────────
export default function ComingSoonPage() {
  usePageMeta('Coming Soon', 'Upcoming movies and TV shows releasing soon — set a reminder so you never miss a release.')
  const showToast = useToast()
  const { user }  = useAuth()

  const [tab, setTab]             = useState('movies')
  const [items, setItems]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [reminders, setReminders] = useState(getLsReminders)

  // ── Load reminders: DB when logged in, localStorage otherwise ────
  useEffect(() => {
    if (!user) { setReminders(getLsReminders()); return }
    getUserReminderIds(user.id).then(ids => setReminders(new Set(ids)))
  }, [user])

  // ── Fetch upcoming titles ─────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    setItems([])

    const today = new Date().toISOString().split('T')[0]
    const in6mo = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const url = tab === 'movies'
      ? `${API_BASE_URL}/discover/movie?primary_release_date.gte=${today}&primary_release_date.lte=${in6mo}&sort_by=popularity.desc&page=1`
      : `${API_BASE_URL}/discover/tv?first_air_date.gte=${today}&first_air_date.lte=${in6mo}&sort_by=popularity.desc&page=1`

    cachedFetch(url, API_OPTIONS, TTL.browse)
      .then(data => { setItems(data.results || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [tab])

  // ── Toggle reminder ───────────────────────────────────────────────
  const handleRemind = useCallback(async (item) => {
    const id    = String(item.id)
    const title = item.title || item.name
    const isOn  = reminders.has(id)
    const next  = new Set(reminders)

    if (isOn) { next.delete(id); showToast(`Reminder removed for "${title}"`) }
    else       { next.add(id);   showToast(`Reminder set for "${title}" 🔔`) }
    setReminders(next)

    if (user) {
      try {
        const date = item.release_date || item.first_air_date || null
        const mt   = tab === 'movies' ? 'movie' : 'tv'
        if (isOn) await removeReminder(user.id, id)
        else      await addReminder(user.id, id, title, item.poster_path, mt, date)
      } catch { setReminders(reminders) }   // revert on error
    } else {
      saveLsReminders(next)
    }
  }, [user, reminders, showToast, tab])

  return (
    <>
      <div className="coming-soon-page">

        {/* ── Header ── */}
        <div className="cs-header">
          <h1 className="cs-title">Coming Soon</h1>
          <p className="cs-subtitle">
            Upcoming releases — tap
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13, flexShrink: 0 }}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            to set a reminder
          </p>
          <div className="cs-tabs">
            <button className={`cs-tab${tab === 'movies' ? ' active' : ''}`} onClick={() => setTab('movies')}>
              Movies
            </button>
            <button className={`cs-tab${tab === 'tv' ? ' active' : ''}`} onClick={() => setTab('tv')}>
              TV Shows
            </button>
          </div>
        </div>

        {/* ── Grid ── */}
        <ul className="cs-cards-ul">
          {loading
            ? Array.from({ length: 20 }).map((_, i) => <CardSkeleton key={i} />)
            : items.length === 0
              ? <div className="browse-empty">
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="22" cy="22" r="14"/>
                <line x1="32" y1="32" x2="43" y2="43"/>
                <line x1="18" y1="22" x2="26" y2="22"/>
                <line x1="22" y1="18" x2="22" y2="26"/>
              </svg>
              <p>No upcoming titles found</p>
              <span>Check back soon — new releases are added daily</span>
            </div>
              : items.map(item => (
                  <ComingSoonCard
                    key={item.id}
                    item={item}
                    mediaType={tab === 'movies' ? 'movie' : 'tv'}
                    reminded={reminders.has(String(item.id))}
                    onRemind={handleRemind}
                  />
                ))
          }
        </ul>

      </div>
      <Footer />
    </>
  )
}
