'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../contexts/AuthContext'
import { findFranchiseBySlug, findFranchiseByCollectionId } from '../data/franchises'
import { getUserPlaylists, createPlaylist, addManyToPlaylist } from '../lib/movieActions'
import PlaylistPicker from '../components/PlaylistPicker'
import { API_BASE_URL, API_OPTIONS } from '../config'
import { cachedFetch, TTL } from '../lib/apiCache'
import { usePageMeta } from '../lib/usePageMeta'
import Spinner from '../components/Spinner'
import AuthModal from '../components/AuthModal'

const hideBrokenImage = (e) => { e.currentTarget.style.display = 'none' }

const PICKER_W    = 220
const GAP         = 6
const MIN_ABOVE   = 240   // px of space needed above before we flip below

function computePos(rect) {
  if (!rect) return { top: 8, left: 8, transformOrigin: 'top right' }
  const vw = window.innerWidth
  const vh = window.innerHeight

  // Right-aligned to the button
  let left = rect.right - PICKER_W
  if (left < 8)                 { left = Math.max(8, rect.left) }
  if (left + PICKER_W > vw - 8) { left = vw - PICKER_W - 8 }

  // Enough room above? → anchor bottom of picker to top of button (no height estimate)
  // Too close to top?  → drop below the button
  if (rect.top >= MIN_ABOVE) {
    return { bottom: vh - rect.top + GAP, left, transformOrigin: 'bottom right' }
  } else {
    return { top: rect.bottom + GAP, left, transformOrigin: 'top right' }
  }
}

async function fetchMovie(id) {
  try {
    return await cachedFetch(`${API_BASE_URL}/movie/${id}`, API_OPTIONS, TTL.detail)
  } catch {
    return null
  }
}

export default function FranchisePage({ routeId } = {}) {
  const { id: paramId }   = useParams() || {}
  const id                = routeId || paramId
  const searchParams      = useSearchParams()
  const currentMovieId    = Number(searchParams.get('current'))
  const router            = useRouter()
  const { user }          = useAuth()

  const [franchise, setFranchise]       = useState(null)

  usePageMeta(
    franchise?.name,
    franchise?.description || franchise?.tagline
  )
  const [movies, setMovies]             = useState([])
  const [loading, setLoading]           = useState(true)
  const [notFound, setNotFound]         = useState(false)
  const [order, setOrder]               = useState('default')
  const [backdropPath, setBackdropPath] = useState(null)

  // add-all state
  const [playlists, setPlaylists] = useState([])
  const [addAllRect, setAddAllRect] = useState(null) // DOMRect when picker open
  const [adding, setAdding]         = useState(false)
  const [addedTo, setAddedTo]       = useState(null)
  const [showAuth, setShowAuth]     = useState(false)
  const [newName, setNewName]       = useState('')
  const [creating, setCreating]     = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  // per-card add state
  const [cardPickerState, setCardPickerState] = useState(null) // { anchorEl, movie }
  const [cardAdded, setCardAdded]             = useState(new Set())

  useEffect(() => { window.scrollTo(0, 0) }, [id])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setNotFound(false)
      setMovies([])
      setOrder('default')
      setBackdropPath(null)
      try {
        let fr = findFranchiseBySlug(id)
        if (!fr && /^\d+$/.test(id)) {
          fr = findFranchiseByCollectionId(id) ?? {
            slug: id, name: null, type: 'collection', collectionId: Number(id),
          }
        }
        if (!fr) { setNotFound(true); return }

        let movieList = []

        if (fr.type === 'collection') {
          const data = await cachedFetch(
            `${API_BASE_URL}/collection/${fr.collectionId}`, API_OPTIONS, TTL.detail
          )
          if (data.success === false) { setNotFound(true); return }
          if (!fr.name) fr = { ...fr, name: data.name, description: data.overview }
          movieList = (data.parts || []).sort((a, b) =>
            (a.release_date || '').localeCompare(b.release_date || '')
          )
          setBackdropPath(data.backdrop_path || movieList[0]?.backdrop_path || null)
        } else {
          const results = await Promise.all(fr.movieIds.map(fetchMovie))
          movieList = results.filter(Boolean)
          setBackdropPath(movieList[0]?.backdrop_path || null)
        }

        setFranchise(fr)
        setMovies(movieList)
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const displayMovies = useMemo(() => {
    if (!franchise?.altOrder || order === 'default') return movies
    const map = new Map(movies.map(m => [m.id, m]))
    return franchise.altOrder.map(oid => map.get(oid)).filter(Boolean)
  }, [movies, franchise, order])

  // Lock scroll when add-all picker is open
  useEffect(() => {
    if (!addAllRect) return
    const scrollY = window.scrollY
    const prevBody = document.body.style.cssText
    document.body.style.cssText = `overflow:hidden;position:fixed;top:-${scrollY}px;left:0;right:0;`
    return () => { document.body.style.cssText = prevBody; window.scrollTo(0, scrollY) }
  }, [addAllRect])

  const openAddAllPicker = async (e) => {
    if (!user) { setShowAuth(true); return }
    const rect = e.currentTarget.getBoundingClientRect()
    if (playlists.length === 0) {
      const pls = await getUserPlaylists(user.id)
      setPlaylists(pls)
    }
    setAddAllRect(rect)
  }

  const addAll = async (playlistId, playlistName) => {
    setAddAllRect(null)
    setAdding(true)
    try {
      await addManyToPlaylist(user.id, playlistId, displayMovies)
      setAddedTo(playlistName)
    } catch (e) {
      console.error(e)
    } finally {
      setAdding(false)
    }
  }

  const createAndAdd = async () => {
    if (!newName.trim() || creating) return
    setCreating(true)
    try {
      const playlist = await createPlaylist(user.id, newName.trim())
      await addAll(playlist.id, playlist.name)
      setNewName('')
      setShowCreate(false)
    } catch (e) { console.error(e) }
    finally { setCreating(false) }
  }

  const openCardPicker = useCallback((e, movie) => {
    e.stopPropagation()
    if (!user) { setShowAuth(true); return }
    setCardPickerState({ anchorRect: e.currentTarget.getBoundingClientRect(), movie })
  }, [user])

  const handleCardPickerClose = useCallback(() => setCardPickerState(null), [])

  const handleCardSaved = useCallback((isSaved) => {
    if (!isSaved || !cardPickerState) return
    const id = cardPickerState.movie.id
    setCardAdded(prev => {
      if (prev.has(id)) return prev        // bail without new reference
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [cardPickerState])

  if (loading) return (
    <main className="fran-page fran-page--center"><Spinner /></main>
  )

  if (notFound) return (
    <main className="fran-page fran-page--center">
      <div className="fran-notfound">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="fran-notfound-icon">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
        </svg>
        <h2>Franchise not found</h2>
        <p>This collection doesn't exist or was removed.</p>
        <button className="fran-browse-btn" onClick={() => router.push('/browse?section=movies')}>Browse movies</button>
      </div>
    </main>
  )

  return (
    <main className="fran-page">

      {/* ── Hero ── */}
      <div className="fran-hero" style={{ '--fran-color': franchise.color }}>
        {backdropPath && (
          <img
            src={`https://image.tmdb.org/t/p/original${backdropPath}`}
            alt=""
            className="fran-hero-bg"
            aria-hidden="true"
            onError={hideBrokenImage}
          />
        )}
        <div className="fran-hero-overlay" />

        <div className="fran-hero-content">
          <p className="fran-eyebrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="fran-eyebrow-icon">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            Watch Order
          </p>
          <h1 className="fran-title">{franchise.name}</h1>
          <p className="fran-tagline">{franchise.tagline || `${displayMovies.length} films`}</p>
          {franchise.description && (
            <p className="fran-description">{franchise.description}</p>
          )}

          <div className="fran-hero-actions">
            {franchise.altOrder && (
              <div className="fran-order-toggle">
                <button
                  className={`fran-order-btn${order === 'default' ? ' fran-order-btn--active' : ''}`}
                  onClick={() => setOrder('default')}
                >
                  {franchise.defaultLabel || 'Default'}
                </button>
                <button
                  className={`fran-order-btn${order === 'alt' ? ' fran-order-btn--active' : ''}`}
                  onClick={() => setOrder('alt')}
                >
                  {franchise.altLabel || 'Alt Order'}
                </button>
              </div>
            )}

            <button
              className={`fran-add-btn${addedTo ? ' fran-add-btn--done' : ''}`}
              onClick={openAddAllPicker}
              disabled={adding}
              style={{ '--fran-color': franchise.color }}
            >
              {addedTo ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Added to {addedTo}
                </>
              ) : adding ? (
                <>
                  <Spinner size={14} />
                  Adding…
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  {user ? 'Add all to playlist' : 'Sign in to add'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Film grid ── */}
      <div className="fran-inner">
        <div className="fran-grid">
          {displayMovies.map((movie, i) => {
            const isCurrent   = movie.id === currentMovieId
            const isCardAdded = cardAdded.has(movie.id)
            return (
              <div
                key={`${movie.id}-${i}`}
                className={`fran-card${isCurrent ? ' fran-card--current' : ''}`}
                style={{ '--fran-color': franchise.color }}
              >
                <Link href={`/movie/${movie.id}`} className="fran-card-link" aria-label={movie.title} />
                <span className="fran-card-num">{i + 1}</span>
                {isCurrent && <span className="fran-card-you-are-here">You are here</span>}
                {/* Poster with overlay add button */}
                <div className="fran-card-poster-area">
                  <div className="fran-card-poster-wrap">
                    <img
                      src={movie.poster_path
                        ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
                        : '/No-Poster.png'}
                      alt={movie.title}
                      className="fran-card-poster"
                    />
                  </div>
                  <div className="fran-card-add-wrap">
                    <button
                      className={`fran-card-add-btn${isCardAdded ? ' fran-card-add-btn--done' : ''}`}
                      onClick={e => openCardPicker(e, movie)}
                      title={isCardAdded ? 'Added to playlist' : 'Add to playlist'}
                      aria-label={isCardAdded ? `${movie.title} added to playlist` : `Add ${movie.title} to playlist`}
                    >
                      {isCardAdded ? (
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
                  </div>
                </div>

                <div className="fran-card-info">
                  <p className="fran-card-title">{movie.title}</p>
                  <div className="fran-card-meta">
                    {movie.release_date && (
                      <span>{movie.release_date.split('-')[0]}</span>
                    )}
                    {movie.vote_average > 0 && (
                      <span className="fran-card-rating">
                        <svg viewBox="0 0 20 20" fill="#f5c518" width="11" height="11">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                        {movie.vote_average.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {addAllRect && createPortal(
        <>
          <div className="picker-dismiss" onMouseDown={e => { e.preventDefault(); setAddAllRect(null); setShowCreate(false); setNewName('') }} />
          <div
            className="picker-popover"
            style={computePos(addAllRect)}
            onClick={e => e.stopPropagation()}
          >
            <div className="picker-header">
              <span className="picker-title">Add {displayMovies.length} films to…</span>
              <button className="picker-close" onClick={() => { setAddAllRect(null); setShowCreate(false); setNewName('') }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="picker-body">
              <div className="picker-list">
                {playlists.map(pl => (
                  <button key={pl.id} className="picker-item" onClick={() => addAll(pl.id, pl.name)}>
                    <span className="picker-item-check">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/></svg>
                    </span>
                    <span className="picker-item-name">{pl.name}</span>
                  </button>
                ))}
              </div>
              {showCreate ? (
                <div className="picker-create">
                  <input
                    className="picker-input"
                    placeholder="Playlist name…"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && createAndAdd()}
                    autoFocus
                  />
                  <div className="picker-create-row">
                    <button className="picker-btn-cancel" onClick={() => { setShowCreate(false); setNewName('') }}>Cancel</button>
                    <button className="picker-btn-save" onClick={createAndAdd} disabled={!newName.trim() || creating}>
                      {creating ? '…' : 'Create'}
                    </button>
                  </div>
                </div>
              ) : (
                <button className="picker-new-btn" onClick={() => setShowCreate(true)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  New Playlist
                </button>
              )}
            </div>
          </div>
        </>,
        document.body
      )}

      {cardPickerState && (
        <PlaylistPicker
          anchorRect={cardPickerState.anchorRect}
          movieId={cardPickerState.movie.id}
          movieTitle={cardPickerState.movie.title}
          moviePosterPath={cardPickerState.movie.poster_path}
          mediaType="movie"
          onSavedChange={handleCardSaved}
          onClose={handleCardPickerClose}
        />
      )}
    </main>
  )
}
