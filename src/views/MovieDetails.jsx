'use client'
import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import MovieDetailsSkeleton from '../components/MovieDetailsSkeleton'
import CuedUpRating from '../components/CuedUpRating'
import Card from '../components/Card'
import { API_BASE_URL, API_OPTIONS, WATCH_REGION } from '../config'
import { cachedFetch, TTL } from '../lib/apiCache'
import { usePageMeta } from '../lib/usePageMeta'
import { useAuth } from '../contexts/AuthContext'
import { getUserSavedMovieIds, getUserFavoriteIds, addToFavorites, removeFromFavorites } from '../lib/movieActions'
import { showToast } from '../lib/toast'
import PlaylistPicker from '../components/PlaylistPicker'
import VideoGallery, { sortVideos } from '../components/VideoGallery'
import AuthModal from '../components/AuthModal'
import CommentsSection from '../components/CommentsSection'
import ImageGallery from '../components/ImageGallery'

const fallbackToPoster = (e) => { e.currentTarget.src = '/No-Poster.png' }

const LANG_NAMES = { en:'English', hi:'Hindi', ja:'Japanese', ko:'Korean', zh:'Chinese', fr:'French', es:'Spanish', de:'German', it:'Italian', pt:'Portuguese', ru:'Russian', ar:'Arabic', ta:'Tamil', te:'Telugu', ml:'Malayalam', bn:'Bengali', th:'Thai', tr:'Turkish', id:'Indonesian', nl:'Dutch', pl:'Polish', sv:'Swedish', da:'Danish', no:'Norwegian', fi:'Finnish', he:'Hebrew', vi:'Vietnamese', fa:'Persian', pa:'Punjabi', mr:'Marathi', gu:'Gujarati', kn:'Kannada' }

const PROVIDER_URLS = {
  // Global
  8:    (t) => `https://www.netflix.com/search?q=${encodeURIComponent(t)}`,
  1796: (t) => `https://www.netflix.com/search?q=${encodeURIComponent(t)}`,
  9:    (t) => `https://www.amazon.com/s?k=${encodeURIComponent(t)}&i=instant-video`,
  10:   (t) => `https://www.amazon.com/s?k=${encodeURIComponent(t)}&i=instant-video`,
  119:  (t) => `https://www.primevideo.com/search/?phrase=${encodeURIComponent(t)}`,
  350:  (t) => `https://tv.apple.com/search?term=${encodeURIComponent(t)}`,
  2:    (t) => `https://tv.apple.com/search?term=${encodeURIComponent(t)}`,
  337:  (t) => `https://www.disneyplus.com/search/${encodeURIComponent(t)}`,
  283:  (t) => `https://www.crunchyroll.com/search?q=${encodeURIComponent(t)}`,
  11:   (t) => `https://mubi.com/en/in/search?term=${encodeURIComponent(t)}`,
  // US
  15:   (t) => `https://www.hulu.com/search?q=${encodeURIComponent(t)}`,
  384:  (t) => `https://play.max.com/search?q=${encodeURIComponent(t)}`,
  386:  (t) => `https://www.peacocktv.com/search?q=${encodeURIComponent(t)}`,
  531:  (t) => `https://www.paramountplus.com/search/${encodeURIComponent(t)}/`,
  257:  () => `https://www.fubo.tv/welcome`,
  // India
  2336: (t) => `https://www.hotstar.com/in/search?q=${encodeURIComponent(t)}`,
  122:  (t) => `https://www.hotstar.com/in/search?q=${encodeURIComponent(t)}`,
  237:  (t) => `https://www.sonyliv.com/search?keyword=${encodeURIComponent(t)}`,
  232:  (t) => `https://www.zee5.com/search/${encodeURIComponent(t)}`,
  309:  () =>  `https://www.sunnxt.com/`,
  220:  (t) => `https://www.mxplayer.in/search?q=${encodeURIComponent(t)}`,
  // Misc
  3:    (t) => `https://play.google.com/store/search?q=${encodeURIComponent(t)}&c=movies`,
  192:  (t) => `https://www.youtube.com/results?search_query=${encodeURIComponent(t)}`,
}

const getProviderUrl = (provider, movieTitle) =>
  PROVIDER_URLS[provider.provider_id]?.(movieTitle)
  ?? `https://www.justwatch.com/in/search?q=${encodeURIComponent(movieTitle)}`

// Renders the provider list: subscription first, then rent/buy, then unavailable
function WatchProviderList({ providers, title, isInTheatres, compact = false }) {
  const flatrate = providers?.flatrate || []
  const rent     = providers?.rent     || []
  const buy      = providers?.buy      || []
  if (flatrate.length > 0) {
    const list = compact ? flatrate.slice(0, 4) : flatrate
    return (
      <div className={compact ? 'mob-providers' : 'watch-providers-list'}>
        {list.map(p => (
          compact
            ? <a key={p.provider_id} href={getProviderUrl(p, title)} target="_blank" rel="noopener noreferrer" title={p.provider_name}>
                <img src={`https://image.tmdb.org/t/p/w45/${p.logo_path}`} alt={p.provider_name} className="mob-provider-logo" />
              </a>
            : <a key={p.provider_id} href={getProviderUrl(p, title)} target="_blank" rel="noopener noreferrer" className="watch-provider" title={p.provider_name}>
                <img src={`https://image.tmdb.org/t/p/w45/${p.logo_path}`} alt={p.provider_name} />
                <span>{p.provider_name}</span>
              </a>
        ))}
      </div>
    )
  }

  if (isInTheatres) {
    return (
      <p className={compact ? 'mob-stat-value mob-stat-theatres' : 'watch-unavailable watch-unavailable--theatres'}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
          <path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z"/>
          <path d="m6.2 5.3 3.1 3.9"/><path d="m12.4 3.4 3.1 3.9"/>
          <path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>
        </svg>
        Currently in Theatres
      </p>
    )
  }

  // Fallback: rent/buy options
  const rentBuy = [...new Map([...rent, ...buy].map(p => [p.provider_id, p])).values()]
  if (rentBuy.length > 0) {
    if (compact) {
      return (
        <div className="mob-providers--rent">
          <span className="mob-rent-label">Rent / Buy</span>
          <div className="mob-providers">
            {rentBuy.slice(0, 4).map(p => (
              <a key={p.provider_id} href={getProviderUrl(p, title)} target="_blank" rel="noopener noreferrer" title={p.provider_name}>
                <img src={`https://image.tmdb.org/t/p/w45/${p.logo_path}`} alt={p.provider_name} className="mob-provider-logo" />
              </a>
            ))}
          </div>
        </div>
      )
    }
    return (
      <>
        <p className="watch-rent-label">Available to Rent / Buy</p>
        <div className="watch-providers-list">
          {rentBuy.map(p => (
            <a key={p.provider_id} href={getProviderUrl(p, title)} target="_blank" rel="noopener noreferrer" className="watch-provider" title={p.provider_name}>
              <img src={`https://image.tmdb.org/t/p/w45/${p.logo_path}`} alt={p.provider_name} />
              <span>{p.provider_name}</span>
            </a>
          ))}
        </div>
      </>
    )
  }

  return compact
    ? <span className="mob-stat-value mob-stat-unavailable">Not streaming</span>
    : <p className="watch-unavailable">Not available to stream</p>
}

// Lower index = shown first
const CREW_JOB_ORDER = [
  'Director',
  'Screenplay', 'Writer', 'Story',
  'Executive Producer',
  'Producer',
  'Director of Photography',
  'Original Music Composer',
  'Music',
]
const KEY_CREW_JOBS = new Set(CREW_JOB_ORDER)

function PeopleCarousel({ title, people, renderCard }) {
  const scrollRef = useRef(null)
  const [canScrollLeft,  setCanScrollLeft]  = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])
  const scroll = (dir) => scrollRef.current?.scrollBy({ left: dir * 500, behavior: 'smooth' })

  return (
    <div className="people-section detail-card">
      <div className="people-section-header">
        <h2 className="people-section-title">{title}</h2>
        <div className="carousel-arrows">
          <button className="fran-browse-arrow" onClick={() => scroll(-1)} disabled={!canScrollLeft} aria-label="Previous">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button className="fran-browse-arrow" onClick={() => scroll(1)} disabled={!canScrollRight} aria-label="Next">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>
      <div className="people-scroll" ref={scrollRef} onScroll={checkScroll}>
        {people.map(renderCard)}
      </div>
    </div>
  )
}

export default function MovieDetails({ routeId } = {}) {
  const { id: paramId } = useParams() || {}
  const id = routeId || paramId
  const { user } = useAuth()
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1200px)')
    setIsDesktop(mq.matches)
    const handler = (e) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  const [movie, setMovie]     = useState(null)

  usePageMeta(
    movie?.title,
    movie?.overview,
    movie?.backdrop_path ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}` : undefined
  )
  const [cast, setCast]       = useState([])
  const [crew, setCrew]       = useState([])
  const [trailer, setTrailer]         = useState(null)
  const [videos, setVideos]           = useState([])
  const [images, setImages]           = useState([])
  const [certification, setCert]      = useState(null)
  const [watchProviders, setWatch]    = useState(null)
  const [isLoading, setIsLoading]     = useState(true)
  const [error, setError]             = useState('')
  const [recs, setRecs]               = useState([])
  const [tmdbReviews, setTmdbReviews] = useState([])
  const recsRef                       = useRef(null)
  const [showPoster, setShowPoster]       = useState(false)
  const [mounted,    setMounted]          = useState(false)
  const [showPicker, setShowPicker]       = useState(false)
  const [pickerRect, setPickerRect]       = useState(null)
  const [showAuth, setShowAuth]           = useState(false)
  const [saved, setSaved]                 = useState(false)
  const [favorited, setFavorited]         = useState(false)
  const [theatricalDate, setTheatrical]   = useState(null)
  const [digitalDate, setDigital]         = useState(null)

  useEffect(() => { window.scrollTo(0, 0) }, [id])
  useEffect(() => { setMounted(true) }, [])

  const isInTheatres = useMemo(() => {
    if (!theatricalDate) return false
    const now = Date.now()
    const theatrical = new Date(theatricalDate).getTime()
    if (theatrical > now) return false                                          // not out yet
    if (digitalDate && new Date(digitalDate).getTime() <= now) return false    // already on digital
    if (!digitalDate && now - theatrical > 120 * 24 * 60 * 60 * 1000) return false  // no digital date but >120 days old — definitely not in theatres
    return true
  }, [theatricalDate, digitalDate])

  useEffect(() => {
    if (!user) { setSaved(false); setFavorited(false); return }
    Promise.all([getUserSavedMovieIds(user.id), getUserFavoriteIds(user.id)])
      .then(([savedIds, favIds]) => {
        setSaved(savedIds.has(String(id)))
        setFavorited(favIds.has(String(id)))
      })
  }, [user, id])

  const handleFavorite = useCallback(async () => {
    if (!user) { setShowAuth(true); return }
    const next = !favorited
    setFavorited(next)
    try {
      if (next) await addToFavorites(user.id, movie?.id, movie?.title, movie?.poster_path, 'movie')
      else       await removeFromFavorites(user.id, movie?.id)
    } catch { setFavorited(!next) }
  }, [user, favorited, movie])

  const handleShare = useCallback(async () => {
    const title = movie?.title || 'this movie'
    const url   = window.location.href
    if (navigator.share) {
      try { await navigator.share({ title, url }) } catch {
        // User cancelled native share.
      }
    } else {
      await navigator.clipboard.writeText(url)
      showToast('Link copied!')
    }
  }, [movie])

  useEffect(() => {
    let cancelled = false
    const fetchAll = async () => {
      setIsLoading(true)
      setError('')
      setTheatrical(null)
      setDigital(null)
      try {
        // One request via append_to_response — 5× fewer round trips.
        const data = await cachedFetch(
          `${API_BASE_URL}/movie/${id}?append_to_response=credits,videos,images,release_dates,watch/providers,recommendations,reviews&include_image_language=en,null`,
          API_OPTIONS, TTL.detail
        )
        if (cancelled) return

        const usRelease = (data.release_dates?.results || []).find(r => r.iso_3166_1 === 'US')
        const cert = usRelease?.release_dates?.find(d => d.certification)?.certification || null
        setCert(cert)

        // Type 3 = wide theatrical, Type 4 = digital
        const relDates = usRelease?.release_dates || []
        setTheatrical(relDates.find(d => d.type === 3)?.release_date || null)
        setDigital(relDates.find(d => d.type === 4)?.release_date || null)
        setWatch(data['watch/providers']?.results?.[WATCH_REGION] || null)

        setMovie(data)
        setCast(data.credits?.cast?.slice(0, 15) || [])

        const seen = new Set()
        const filteredCrew = (data.credits?.crew || [])
          .filter(c => KEY_CREW_JOBS.has(c.job))
          .filter(c => {
            const key = `${c.id}-${c.job}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
          .sort((a, b) => {
            const ai = CREW_JOB_ORDER.indexOf(a.job)
            const bi = CREW_JOB_ORDER.indexOf(b.job)
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
          })
          .slice(0, 12)
        setCrew(filteredCrew)

        const allVids = sortVideos(data.videos?.results)
        const tr = allVids.find(v => v.type === 'Trailer' && v.official)
          || allVids.find(v => v.type === 'Trailer')
          || allVids.find(v => v.type === 'Teaser' && v.official)
          || allVids.find(v => v.type === 'Teaser')
          || null
        setTrailer(tr)
        setVideos(allVids)
        const backdrops = (data.images?.backdrops || [])
          .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
          .slice(0, 30)
        setImages(backdrops)
        setRecs((data.recommendations?.results || []).filter(r => r.poster_path).slice(0, 10))
        setTmdbReviews(data.reviews?.results || [])
      } catch {
        if (!cancelled) setError('Could not load movie details.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    fetchAll()
    return () => { cancelled = true }
  }, [id])

  const handlePickerClose  = useCallback(() => setShowPicker(false), [])
  const renderCastCard = useCallback((member) => (
    <Link key={member.id} href={`/person/${member.id}`} className="person-thumb">
      <img
        src={member.profile_path ? `https://image.tmdb.org/t/p/w185/${member.profile_path}` : '/No-Poster.png'}
        alt={member.name}
        onError={fallbackToPoster}
      />
      <p className="cast-name">{member.name}</p>
      <p className="cast-character">{member.character}</p>
    </Link>
  ), [])
  const renderCrewCard = useCallback((member) => (
    <Link key={`${member.id}-${member.job}`} href={`/person/${member.id}`} className="person-thumb">
      <img
        src={member.profile_path ? `https://image.tmdb.org/t/p/w185/${member.profile_path}` : '/No-Poster.png'}
        alt={member.name}
        onError={fallbackToPoster}
      />
      <p className="cast-name">{member.name}</p>
      <p className="cast-character">{member.job}</p>
    </Link>
  ), [])

  if (isLoading) return <MovieDetailsSkeleton />

  if (error || !movie) {
    return (
      <main>
        <div className="wrapper">
          <p className="error-msg mt-10">{error || 'Movie not found.'}</p>
        </div>
      </main>
    )
  }

  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500/${movie.poster_path}`
    : '/No-Poster.png'

  const backdropUrl = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280/${movie.backdrop_path}`
    : null

  const runtime = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : null

  return (
    <main className="relative">
      {backdropUrl && (
        <div className="movie-backdrop" style={{ backgroundImage: `url(${backdropUrl})` }} />
      )}

      {/* ── Mobile-only cinematic header ── */}
      <div className="mob-detail-top">
        <div
          className="mob-hero-backdrop"
          style={backdropUrl ? { backgroundImage: `url(${backdropUrl})` } : {}}
        >
          <div className="mob-hero-fade" />
          {trailer ? (
            <a
              href={`https://www.youtube.com/watch?v=${trailer.key}`}
              target="_blank" rel="noopener noreferrer"
              className="mob-play-btn" aria-label="Watch trailer"
            >
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            </a>
          ) : null}
          <img src={posterUrl} alt={movie.title} className="mob-hero-poster" onClick={() => setShowPoster(true)} />
        </div>
        <div className="mob-hero-info">
          <div className="mob-hero-text">
            <h1 className="mob-hero-title">{movie.title}</h1>
            <div className="mob-info-chips">
              {movie.vote_average > 0 && (
                <span className="mob-chip mob-chip--rating">
                  <svg viewBox="0 0 20 20" fill="#f5c518" className="mob-star-icon"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  {movie.vote_average.toFixed(1)}
                </span>
              )}
              {certification && <span className="mob-chip">{certification}</span>}
              {runtime && <span className="mob-chip">{runtime}</span>}
              {movie.original_language && <span className="mob-chip">{LANG_NAMES[movie.original_language] || movie.original_language.toUpperCase()}</span>}
            </div>
          </div>
        </div>
        <div className="mob-save-row">
          <button className={`mob-save-btn${saved ? ' mob-save-btn--saved' : ''}`} onClick={e => { if (!user) { setShowAuth(true); return; } setPickerRect(e.currentTarget.getBoundingClientRect()); setShowPicker(true) }}>
            <svg viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
            </svg>
            {saved ? 'Saved to List' : 'Save to List'}
          </button>
          {user && (
            <button
              className={`mob-icon-btn${favorited ? ' mob-icon-btn--fav' : ''}`}
              onClick={handleFavorite}
              aria-label={favorited ? 'Remove from favourites' : 'Add to favourites'}
            >
              <svg viewBox="0 0 24 24" fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
          )}
          <button
            className="mob-icon-btn"
            onClick={handleShare}
            aria-label="Share"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="wrapper detail-wrapper">

        {/* ── Mobile stats strip (release date + genre) ── */}
        <div className="mob-stats-strip">  {/* stays outside layout — mobile only */}
          {movie.release_date && (
            <div className="mob-stat">
              <span className="mob-stat-label">Release Date</span>
              <span className="mob-stat-value">{new Date(movie.release_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          )}
          {movie.genres?.length > 0 && (
            <div className="mob-stat">
              <span className="mob-stat-label">Genre</span>
              <span className="mob-stat-value">{movie.genres.map(g => g.name).join(', ')}</span>
            </div>
          )}
          {movie.budget > 0 && (
            <div className={`mob-stat${movie.revenue <= 0 ? ' mob-stat--full' : ''}`}>
              <span className="mob-stat-label">Budget</span>
              <span className="mob-stat-value">${movie.budget >= 1_000_000_000 ? (movie.budget / 1_000_000_000).toFixed(1) + 'B' : Math.round(movie.budget / 1_000_000) + 'M'}</span>
            </div>
          )}
          {movie.revenue > 0 && (
            <div className={`mob-stat${movie.budget <= 0 ? ' mob-stat--full' : ''}`}>
              <span className="mob-stat-label">Box Office</span>
              <span className="mob-stat-value">${movie.revenue >= 1_000_000_000 ? (movie.revenue / 1_000_000_000).toFixed(2) + 'B' : Math.round(movie.revenue / 1_000_000) + 'M'}</span>
            </div>
          )}
          <div className="mob-stat mob-stat--providers">
            <span className="mob-stat-label">Where to Watch</span>
            <WatchProviderList providers={watchProviders} title={movie.title} isInTheatres={isInTheatres} compact />
          </div>
        </div>

        {/* ── Two-column layout: main content + recs sidebar ── */}
        <div className="detail-layout">

        {/* Title row spans both columns so hero + sidebar start on the same line */}
        <div className="detail-title-row">

          {/* Left: title + meta — wraps freely */}
          <div className="detail-title-body">
            <h1 className="detail-title">{movie.title}</h1>
            <span className="detail-title-sep" />
            <span className="detail-title-rating">
              <svg viewBox="0 0 20 20" fill="#f5c518" className="meta-icon" style={{ width: 26, height: 26 }}><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              {movie.vote_average?.toFixed(1) || 'N/A'}
            </span>
            {movie.genres?.length > 0 && (
              <div className="genres">
                {movie.genres.map((g) => (
                  <span key={g.id} className="genre-tag">{g.name}</span>
                ))}
              </div>
            )}
          </div>

          {/* Right: action buttons — never wraps */}
          <div className="detail-title-actions">
            {user && (
              <button
                className={`detail-icon-btn${favorited ? ' detail-icon-btn--fav' : ''}`}
                onClick={handleFavorite}
                aria-label={favorited ? 'Remove from favourites' : 'Add to favourites'}
              >
                <svg viewBox="0 0 24 24" fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </button>
            )}
            <button
              className="detail-icon-btn"
              onClick={handleShare}
              aria-label="Share"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </button>
            <button className={`watchlist-btn${saved ? ' watchlist-btn--added' : ''}`} onClick={e => { if (!user) { setShowAuth(true); return; } setPickerRect(e.currentTarget.getBoundingClientRect()); setShowPicker(true) }}>
              <svg viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
              </svg>
              {saved ? 'Saved to List' : 'Add to List'}
            </button>
          </div>

          {showPicker && movie && (
            <PlaylistPicker
              anchorRect={pickerRect}
              movieId={movie.id}
              movieTitle={movie.title}
              moviePosterPath={movie.poster_path}
              mediaType="movie"
              onSavedChange={setSaved}
              onClose={handlePickerClose}
            />
          )}
        </div>{/* end detail-title-row */}

        <div className="detail-main">

        {/* ── Hero grid: poster + trailer + stats ── */}
        <div className="detail-hero">

          {/* Poster */}
          <div className="detail-hero-poster" onClick={() => setShowPoster(true)}>
            <img src={posterUrl} alt={movie.title} />
          </div>

          {/* Trailer or no-trailer fallback */}
          {trailer ? (
            <div className="detail-bento-trailer">
              <iframe
                src={`https://www.youtube.com/embed/${trailer.key}?rel=0&modestbranding=1`}
                title={trailer.name || 'Trailer'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div
              className="detail-bento-trailer detail-no-trailer"
              style={backdropUrl ? { backgroundImage: `url(${backdropUrl})` } : {}}
            >
              <div className="no-trailer-overlay">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="no-trailer-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <p className="no-trailer-text">No trailer available</p>
              </div>
            </div>
          )}

        </div>{/* end detail-hero (poster + trailer only) */}

{/* ── Info row: [stats + overview] | [where to watch + rating] ── */}
<div className="detail-info-row">

  {/* Left column: horizontal stats bar + description */}
  <div className="detail-info-left">

    {/* Merged card: stats bar on top, description below */}
    <div className="detail-card detail-merged-card detail-bento-overview">

      {/* Horizontal stats strip */}
      <div className="detail-stats-bar">
        {movie.release_date && (
          <div className="detail-stat-item">
            <svg viewBox="0 0 20 20" fill="#AB8BFF" className="meta-icon"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/></svg>
            <p className="detail-stat-value">{new Date(movie.release_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>
        )}
        {runtime && (
          <div className="detail-stat-item">
            <svg viewBox="0 0 20 20" fill="#60a5fa" className="meta-icon"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/></svg>
            <p className="detail-stat-value">{runtime}</p>
          </div>
        )}
        {movie.original_language && (
          <div className="detail-stat-item">
            <svg viewBox="0 0 20 20" fill="#34d399" className="meta-icon"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd"/></svg>
            <p className="detail-stat-value">{LANG_NAMES[movie.original_language] || movie.original_language.toUpperCase()}</p>
          </div>
        )}
        {certification && (
          <div className="detail-stat-item">
            <svg viewBox="0 0 20 20" fill="#f59e0b" className="meta-icon"><path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd"/></svg>
            <p className="detail-stat-value">{certification}</p>
          </div>
        )}
        {movie.budget > 0 && (
          <div className="detail-stat-item">
            <svg viewBox="0 0 20 20" fill="#fbbf24" className="meta-icon"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/></svg>
            <p className="detail-stat-value">Budget · ${movie.budget >= 1_000_000_000 ? (movie.budget / 1_000_000_000).toFixed(1) + 'B' : Math.round(movie.budget / 1_000_000) + 'M'}</p>
          </div>
        )}
        {movie.revenue > 0 && (
          <div className="detail-stat-item">
            <svg viewBox="0 0 20 20" fill="#4ade80" className="meta-icon"><path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v2a1 1 0 102 0V9z" clipRule="evenodd"/></svg>
            <p className="detail-stat-value">Grossed · ${movie.revenue >= 1_000_000_000 ? (movie.revenue / 1_000_000_000).toFixed(2) + 'B' : Math.round(movie.revenue / 1_000_000) + 'M'}</p>
          </div>
        )}
        {movie.status && (
          <div className="detail-stat-item">
            <svg viewBox="0 0 20 20" fill="#4ade80" className="meta-icon"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
            <p className={`detail-stat-value stat-status stat-status--${movie.status.toLowerCase().replace(/\s+/g, '-')}`}>{movie.status}</p>
          </div>
        )}
      </div>

      {/* Description body */}
      {movie.overview && (
        <div className="detail-merged-body">
          <div className="detail-card-label">Movie Description</div>
          <div className="detail-overview-scroll">
            <p className="detail-overview-text">{movie.overview}</p>
            {movie.tagline && <p className="detail-tagline">"{movie.tagline}"</p>}
            {movie.production_companies?.length > 0 && (
              <p className="detail-production-text">
                Produced by {movie.production_companies.map(c => c.name).join(', ')}
              </p>
            )}
          </div>
          {movie.production_companies?.some(c => c.logo_path) && (
            <div className="detail-production-bar">
              <div className="detail-production-logos">
                {movie.production_companies.filter(c => c.logo_path).map(c => (
                  <img key={c.id} src={`https://image.tmdb.org/t/p/w92/${c.logo_path}`} alt={c.name} title={c.name} className="detail-production-logo" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  </div>

  {/* Right column: Where to Watch + CuedUp rating */}
  <div className="detail-info-right">
    <div className="detail-card detail-hero-watch">
      <h3 className="watch-title">Where to Watch</h3>
      <WatchProviderList providers={watchProviders} title={movie.title} isInTheatres={isInTheatres} />
      <button
        className="go-to-reviews-btn"
        onClick={() => document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        Reviews for {movie.title}
      </button>
    </div>

  </div>

</div>

        {/* ── Video Gallery ── */}
        <VideoGallery videos={videos} />
        <ImageGallery images={images} />

        {/* ── Cast ── */}
        {cast.length > 0 && (
          <PeopleCarousel title="Cast" people={cast} renderCard={renderCastCard} />
        )}

        {/* ── Crew ── */}
        {crew.length > 0 && (
          <PeopleCarousel title="Crew" people={crew} renderCard={renderCrewCard} />
        )}

        {/* ── CuedUp Rating — mobile only; desktop instance lives in sidebar ── */}
        {!isDesktop && (
          <div className="mob-cuedup">
            <CuedUpRating
              movieId={Number(id)}
              movieTitle={movie.title}
              moviePosterPath={movie.poster_path}
            />
          </div>
        )}

        {/* ── Comments + TMDB Reviews ── */}
        <CommentsSection movieId={Number(id)} tmdbReviews={tmdbReviews} />

        {/* ── Recommendations (mobile horizontal scroll — hidden on wide desktop) ── */}
        {recs.length > 0 && (
          <section className="recs-section recs-section--mobile">
            <div className="recs-header">
              <h2 className="recs-heading">You Might Also Like</h2>
              <div className="recs-arrows">
                <button className="recs-arrow" onClick={() => recsRef.current?.scrollBy({ left: -560, behavior: 'smooth' })} aria-label="Scroll left">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <button className="recs-arrow" onClick={() => recsRef.current?.scrollBy({ left: 560, behavior: 'smooth' })} aria-label="Scroll right">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>
            </div>
            <div className="recs-scroll" ref={recsRef}>
              {recs.map(item => (
                <div key={item.id} className="recs-card-wrap">
                  <Card movie={item} mediaType="movie" />
                </div>
              ))}
            </div>
          </section>
        )}

        </div>{/* end detail-main */}

        {/* ── Desktop sidebar: Where to Watch + rec list ── */}
        <aside className="detail-sidebar">
          <div className="detail-card detail-hero-watch sidebar-watch">
            <h3 className="watch-title">Where to Watch</h3>
            <WatchProviderList providers={watchProviders} title={movie.title} isInTheatres={isInTheatres} />
          </div>
          {isDesktop && (
            <div className="sidebar-cuedup">
              <CuedUpRating
                movieId={Number(id)}
                movieTitle={movie.title}
                moviePosterPath={movie.poster_path}
              />
              <button
                className="sidebar-reviews-link"
                onClick={() => document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                Go to user reviews
              </button>
            </div>
          )}

          {recs.length > 0 && (
            <>
              <h3 className="sidebar-recs-title">You May Also Like</h3>
              <div className="sidebar-recs-list">
                {recs.map(item => {
                  const isTV  = item.media_type === 'tv'
                  const title = item.title || item.name
                  const year  = (item.release_date || item.first_air_date)?.split('-')[0] || '—'
                  return (
                    <Link
                      key={item.id}
                      href={isTV ? `/tv/${item.id}` : `/movie/${item.id}`}
                      className="sidebar-rec-item"
                    >
                      <img
                        src={
                          item.backdrop_path
                            ? `https://image.tmdb.org/t/p/w300/${item.backdrop_path}`
                            : item.poster_path
                              ? `https://image.tmdb.org/t/p/w185/${item.poster_path}`
                              : '/No-Poster.png'
                        }
                        alt={title}
                        className="sidebar-rec-poster"
                        onError={fallbackToPoster}
                      />
                      <div className="sidebar-rec-info">
                        <p className="sidebar-rec-title">{title}</p>
                        <p className="sidebar-rec-meta">
                          {year}{item.vote_average > 0 && <span className="sidebar-rec-rating"> · ★ {item.vote_average.toFixed(1)}</span>}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </>
          )}
        </aside>

        </div>{/* end detail-layout */}

      </div>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {mounted && showPoster && createPortal(
        <div
          style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}
          onClick={() => setShowPoster(false)}
        >
          <button
            onClick={e => { e.stopPropagation(); setShowPoster(false) }}
            aria-label="Close"
            style={{ position:'absolute', top:'16px', right:'16px', width:'40px', height:'40px', borderRadius:'50%', border:'none', background:'rgba(255,255,255,0.15)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', zIndex:10000 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="18" height="18">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
          <img
            src={`https://image.tmdb.org/t/p/w780/${movie.poster_path}`}
            alt={movie.title}
            style={{ maxHeight:'90vh', maxWidth:'min(500px,90vw)', borderRadius:'16px', boxShadow:'0 40px 120px rgba(0,0,0,0.9)' }}
            onClick={e => e.stopPropagation()}
          />
        </div>,
        document.body
      )}
    </main>
  )
}
