'use client'
import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '../contexts/AuthContext'
import {
  getUserFavoriteIds,
  addToFavorites,
  removeFromFavorites,
} from '../lib/movieActions'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const LANG_MAP = {
  en:'English', fr:'French', es:'Spanish', de:'German', it:'Italian',
  pt:'Portuguese', ru:'Russian', ja:'Japanese', ko:'Korean', zh:'Chinese',
  hi:'Hindi', ar:'Arabic', tr:'Turkish', pl:'Polish', nl:'Dutch',
  sv:'Swedish', da:'Danish', fi:'Finnish', no:'Norwegian', th:'Thai',
  id:'Indonesian', ms:'Malay', vi:'Vietnamese', fa:'Persian', he:'Hebrew',
  cs:'Czech', hu:'Hungarian', ro:'Romanian', uk:'Ukrainian', bn:'Bengali',
  ta:'Tamil', te:'Telugu', ml:'Malayalam',
}

function formatLang(code) {
  if (!code) return 'N/A'
  return LANG_MAP[code.toLowerCase()] || code.toUpperCase()
}

function formatDate(dateStr) {
  if (!dateStr) return 'TBA'
  const [year, month, day] = dateStr.split('-').map(Number)
  return `${day} ${MONTHS[month - 1]}, ${year}`
}

export function daysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0)
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24))
}

export function BadgeLabel({ days }) {
  if (days === null) return null
  if (days === 0)  return '🎬 Today'
  if (days === 1)  return 'Tomorrow'
  if (days < 7)   return `${days} days`
  if (days < 30)  return `${Math.ceil(days / 7)}w away`
  return `${Math.ceil(days / 30)}mo away`
}

export default function ComingSoonCard({ item, mediaType = 'movie', reminded = false, onRemind }) {
  const { user } = useAuth()
  const [thumbLoaded, setThumbLoaded] = useState(false)
  const [fullLoaded, setFullLoaded]   = useState(false)
  const [favorited, setFavorited] = useState(false)

  const title   = item.title || item.name
  const date    = item.release_date || item.first_air_date
  const days    = daysUntil(date)
  const movieId = mediaType === 'tv' ? `tv-${item.id}` : item.id
  const path    = mediaType === 'tv' ? `/tv/${item.id}` : `/movie/${item.id}`

  useEffect(() => {
    if (!user) { setFavorited(false); return }
    getUserFavoriteIds(user.id).then(ids => setFavorited(ids.has(String(movieId))))
  }, [user, movieId])

  const handleFavoriteClick = useCallback(async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) return
    const next = !favorited
    setFavorited(next)
    try {
      if (next) {
        await addToFavorites(user.id, movieId, title, item.poster_path, mediaType)
      } else {
        await removeFromFavorites(user.id, movieId)
      }
    } catch {
      setFavorited(!next)
    }
  }, [user, movieId, favorited, title, item.poster_path, mediaType])

  return (
    <Link href={path} className="movie-card block">

      {/* ── Poster ── */}
      <div className="card-img-wrap">
        {!item.poster_path && !fullLoaded && <div className="card-img-skeleton" />}

        {item.poster_path && (
          <img
            src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
            alt=""
            aria-hidden="true"
            className="card-img-thumb"
            style={{ opacity: thumbLoaded ? 1 : 0 }}
            onLoad={() => setThumbLoaded(true)}
          />
        )}

        <img
          src={item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '/No-Poster.png'}
          alt={title}
          loading="lazy"
          className="card-img-full"
          onLoad={() => setFullLoaded(true)}
          style={{ opacity: fullLoaded ? 1 : 0 }}
        />

        {/* Countdown badge — top left */}
        {days !== null && days >= 0 && (
          <span className={`cs-badge${days === 0 ? ' cs-badge--today' : ''}`}>
            <BadgeLabel days={days} />
          </span>
        )}

        {user && (
          <>
            {/* Favourites heart — left of bell */}
            <button
              className={`card-fav-btn${favorited ? ' card-fav-btn--active' : ''}`}
              onPointerDown={e => e.stopPropagation()}
              onClick={handleFavoriteClick}
              aria-label={favorited ? 'Remove from favourites' : 'Add to favourites'}
            >
              <svg viewBox="0 0 24 24" fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>

            {/* Bell / reminder — bottom right */}
            <button
              className={`card-watchlist-btn${reminded ? ' card-watchlist-btn--reminded' : ''}`}
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.preventDefault(); e.stopPropagation(); onRemind?.(item) }}
              title={reminded ? 'Remove reminder' : 'Remind me'}
              aria-label={reminded ? 'Remove reminder' : 'Set reminder'}
            >
              <svg viewBox="0 0 24 24" fill={reminded ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
          </>
        )}

        {/* Bell shown even when logged out — just can't save */}
        {!user && (
          <button
            className="card-watchlist-btn"
            onClick={e => { e.preventDefault(); e.stopPropagation(); onRemind?.(item) }}
            title="Remind me"
            aria-label="Set reminder"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>
        )}
      </div>

      {/* ── Title ── */}
      <div className="mt-4">
        <h3>{title}</h3>
      </div>

      {/* ── Meta row ── */}
      <div className="content">
        <p className="lang">{formatLang(item.original_language)}</p>
        <span>•</span>
        <p className="year">
          <span className="card-date-full">{formatDate(date)}</span>
          <span className="card-date-year">{date ? date.split('-')[0] : 'TBA'}</span>
        </p>
      </div>

    </Link>
  )
}
