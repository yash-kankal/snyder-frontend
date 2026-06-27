'use client'
import { useState, useEffect, useCallback, memo } from 'react'
import Link from 'next/link'
import { useAuth } from '../contexts/AuthContext'
import {
  getUserSavedMovieIds,
  getUserFavoriteIds,
  addToFavorites,
  removeFromFavorites,
} from '../lib/movieActions'
import PlaylistPicker from './PlaylistPicker'
import StarIcon from './StarIcon'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

const LANGUAGES = {
  en: 'English', fr: 'French', es: 'Spanish', de: 'German', it: 'Italian',
  pt: 'Portuguese', ru: 'Russian', ja: 'Japanese', ko: 'Korean', zh: 'Chinese',
  hi: 'Hindi', mr: 'Marathi', ar: 'Arabic', tr: 'Turkish', pl: 'Polish', nl: 'Dutch',
  sv: 'Swedish', da: 'Danish', fi: 'Finnish', no: 'Norwegian', th: 'Thai',
  id: 'Indonesian', ms: 'Malay', vi: 'Vietnamese', fa: 'Persian', he: 'Hebrew',
  cs: 'Czech', hu: 'Hungarian', ro: 'Romanian', uk: 'Ukrainian', bn: 'Bengali',
}

function formatLang(code) {
  if (!code) return 'N/A'
  return LANGUAGES[code.toLowerCase()] || code.toUpperCase()
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A'
  const [year, month, day] = dateStr.split('-').map(Number)
  return `${day} ${MONTHS[month - 1]}, ${year}`
}

const Card = memo(function Card({ movie, mediaType = 'movie', showNewBadge = false, watchedEpisodes = 0 }) {
  const { user } = useAuth()
  const [thumbLoaded, setThumbLoaded] = useState(false)
  const [fullLoaded, setFullLoaded]   = useState(false)
  const [showPicker, setShowPicker]   = useState(false)
  const [pickerRect, setPickerRect]   = useState(null)
  const [saved, setSaved]             = useState(false)
  const [favorited, setFavorited]     = useState(false)

  const title   = movie.title || movie.name
  const date    = movie.release_date || movie.first_air_date
  const href    = mediaType === 'tv' ? `/tv/${movie.id}` : `/movie/${movie.id}`
  const movieId = mediaType === 'tv' ? `tv-${movie.id}` : movie.id

  // "New" = released in the last 45 days (and not in the future). TMDB has no
  // "added to platform" date, so recency of release is the reliable signal.
  const isNew = showNewBadge && date && (() => {
    const released = new Date(date).getTime()
    const now = Date.now()
    return released <= now && now - released <= 45 * 24 * 60 * 60 * 1000
  })()

  useEffect(() => {
    if (!user) { setSaved(false); setFavorited(false); return }
    Promise.all([
      getUserSavedMovieIds(user.id),
      getUserFavoriteIds(user.id),
    ]).then(([savedIds, favIds]) => {
      setSaved(savedIds.has(String(movieId)))
      setFavorited(favIds.has(String(movieId)))
    })
  }, [user, movieId])

  const handleWatchlistClick = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setPickerRect(e.currentTarget.getBoundingClientRect())
    setShowPicker(true)
  }, [])

  const handleFavoriteClick = useCallback(async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) return
    const next = !favorited
    setFavorited(next)   // optimistic
    try {
      if (next) {
        await addToFavorites(user.id, movieId, title, movie.poster_path, mediaType)
      } else {
        await removeFromFavorites(user.id, movieId)
      }
    } catch {
      setFavorited(!next)  // revert on error
    }
  }, [user, movieId, favorited, title, movie.poster_path, mediaType])

  const handleClosePicker = useCallback(() => setShowPicker(false), [])

  return (
    <Link href={href} className='movie-card block'>

      {/* Fixed 2:3 container — never collapses while image loads */}
      <div className='card-img-wrap'>
        {isNew && <span className="card-new-badge">NEW</span>}
        {watchedEpisodes > 0 && (
          <span className="card-ep-progress">
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="9" height="9"><polyline points="1 6 4.5 9.5 11 3"/></svg>
            {watchedEpisodes} ep{watchedEpisodes !== 1 ? 's' : ''}
          </span>
        )}
        {/* Skeleton — shows until at least thumb is loaded */}
        {!fullLoaded && !thumbLoaded && <div className='card-img-skeleton' />}

        {/* LQIP blur thumbnail — tiny w92 loads almost instantly */}
        {movie.poster_path && (
          <img
            src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
            alt=""
            aria-hidden="true"
            className="card-img-thumb"
            style={{ opacity: thumbLoaded && !fullLoaded ? 1 : 0 }}
            onLoad={() => setThumbLoaded(true)}
            onError={() => setThumbLoaded(false)}
          />
        )}

        {/* Full-resolution image fades in over the blur */}
        <img
          src={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '/No-Poster.png'}
          alt={title}
          className="card-img-full"
          onLoad={() => setFullLoaded(true)}
          onError={e => { e.currentTarget.src = '/No-Poster.png'; setFullLoaded(true) }}
          style={{ opacity: fullLoaded ? 1 : 0 }}
        />

        {user && (
          <>
            {/* ── Favourites heart — left of watchlist button ── */}
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

            {/* ── Playlist / watchlist ── */}
            <button
              className={`card-watchlist-btn${saved ? ' card-watchlist-btn--active' : ''}`}
              onPointerDown={e => e.stopPropagation()}
              onClick={handleWatchlistClick}
              aria-label={saved ? 'In a playlist' : 'Add to playlist'}
            >
              {saved ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="15" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="12" y2="18"/>
                  <line x1="18" y1="15" x2="18" y2="21"/><line x1="15" y1="18" x2="21" y2="18"/>
                </svg>
              )}
            </button>
          </>
        )}

        {showPicker && (
          <PlaylistPicker
            anchorRect={pickerRect}
            movieId={movieId}
            movieTitle={title}
            moviePosterPath={movie.poster_path}
            mediaType={mediaType}
            onSavedChange={setSaved}
            onClose={handleClosePicker}
          />
        )}
      </div>

      <h3>{title}</h3>

      <div className='content'>
        <div className='rating'>
          <StarIcon className="rating-star" />
          <p>{movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</p>
        </div>

        <span>•</span>

        <p className='lang'>{formatLang(movie.original_language)}</p>

        <span>•</span>

        <p className='year'>
          <span className='card-date-full'>{formatDate(date)}</span>
          <span className='card-date-year'>{date ? date.split('-')[0] : 'N/A'}</span>
        </p>
      </div>

    </Link>
  )
})

export default Card
