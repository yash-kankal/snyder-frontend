'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import MovieDetailsSkeleton from '../components/MovieDetailsSkeleton'
import Card from '../components/Card'
import { API_BASE_URL, API_OPTIONS, WATCH_REGION } from '../config'
import { cachedFetch, TTL } from '../lib/apiCache'
import { scrollToTop, scrollToElement } from '../lib/lenisScroll'
import { usePageMeta } from '../lib/usePageMeta'
import { useAuth } from '../contexts/AuthContext'
import { getUserSavedMovieIds, getUserFavoriteIds, addToFavorites, removeFromFavorites, getWatchedIds, addToWatched, removeFromWatched, getShowEpisodeProgress, markEpisodeWatched, markEpisodeUnwatched } from '../lib/movieActions'
import { showToast } from '../lib/toast'
import PlaylistPicker from '../components/PlaylistPicker'
import VideoGallery, { sortVideos } from '../components/VideoGallery'
import AuthModal from '../components/AuthModal'
import CommentsSection from '../components/CommentsSection'
import ImageGallery from '../components/ImageGallery'
import TrailerEmbed from '../components/TrailerEmbed'
import ErrorState from '../components/ErrorState'
import PersonAvatar from '../components/PersonAvatar'

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

const getProviderUrl = (provider, title) =>
  PROVIDER_URLS[provider.provider_id]?.(title)
  ?? `https://www.justwatch.com/in/search?q=${encodeURIComponent(title)}`

function WatchProviderList({ providers, title, compact = false }) {
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


// True on real touch/mobile devices — hover events fire unreliably on touch
const IS_HOVER_DEVICE = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

// ── Seasons panel ─────────────────────────────────────────────────────────────
function SeasonsPanel({ showId, seasons, user }) {
  const mainSeasons = seasons.filter(s => s.season_number > 0)
  const firstSn     = mainSeasons[0]?.season_number ?? 1

  const [activeSn, setActiveSn]     = useState(firstSn)
  const [seasonData, setSeasonData] = useState({})
  const [loading, setLoading]       = useState(null)
  const scrollRef                   = useRef(null)
  const seasonTabsRef               = useRef(null)
  const [activeEp, setActiveEp]     = useState(null)
  const [panelHiding, setPanelHiding] = useState(false)
  const hideTimerRef                = useRef(null)
  const lastEpRef                   = useRef(null)
  if (activeEp) lastEpRef.current   = activeEp

  const [watchedEps, setWatchedEps] = useState(new Set())

  useEffect(() => {
    if (!user) { setWatchedEps(new Set()); return }
    getShowEpisodeProgress(user.id, showId)
      .then(eps => setWatchedEps(eps))
      .catch(() => {})
  }, [user, showId])

  const toggleEpisode = useCallback(async (ep, e) => {
    e.stopPropagation()
    if (!user) return
    const key = `S${activeSn}E${ep.episode_number}`
    const nowWatched = !watchedEps.has(key)
    setWatchedEps(prev => {
      const next = new Set(prev)
      if (nowWatched) next.add(key)
      else next.delete(key)
      return next
    })
    try {
      if (nowWatched) await markEpisodeWatched(user.id, showId, activeSn, ep.episode_number)
      else            await markEpisodeUnwatched(user.id, showId, activeSn, ep.episode_number)
    } catch {
      setWatchedEps(prev => {
        const next = new Set(prev)
        if (nowWatched) next.delete(key)
        else next.add(key)
        return next
      })
    }
  }, [user, showId, activeSn, watchedEps])

  const showPanel = (ep) => {
    clearTimeout(hideTimerRef.current)
    setPanelHiding(false)
    setActiveEp(ep)
  }
  const hidePanel = () => {
    setPanelHiding(true)
    hideTimerRef.current = setTimeout(() => {
      setActiveEp(null)
      setPanelHiding(false)
    }, 300)
  }

  const fetchSeason = async (sn) => {
    if (seasonData[sn]) return
    setLoading(sn)
    try {
      const data = await cachedFetch(
        `${API_BASE_URL}/tv/${showId}/season/${sn}`,
        API_OPTIONS, TTL.detail
      )
      setSeasonData(prev => ({ ...prev, [sn]: data }))
    } catch (e) { console.error(e) }
    finally { setLoading(null) }
  }

  useEffect(() => { fetchSeason(firstSn) }, []) // eslint-disable-line

  // Cleanup hide timer on unmount to prevent state updates on unmounted component
  useEffect(() => () => clearTimeout(hideTimerRef.current), [])

  const selectSeason = (sn) => {
    clearTimeout(hideTimerRef.current)
    setActiveSn(sn)
    fetchSeason(sn)
    setActiveEp(null)
    setPanelHiding(false)
    if (scrollRef.current) scrollRef.current.scrollLeft = 0
  }

  if (mainSeasons.length === 0) return null

  const activeSeason   = mainSeasons.find(s => s.season_number === activeSn)
  const episodes       = seasonData[activeSn]?.episodes || []
  const isLoading      = loading === activeSn
  const watchedInSeason = episodes.filter(ep => watchedEps.has(`S${activeSn}E${ep.episode_number}`)).length

  const scrollEps      = (dir) => scrollRef.current?.scrollBy({ left: dir * 620, behavior: 'smooth' })
  const scrollSeasons  = (dir) => seasonTabsRef.current?.scrollBy({ left: dir * 300, behavior: 'smooth' })

  return (
    <div className="seasons-panel detail-card">

      {/* Header: tabs left, season-scroll arrows right */}
      <div className="seasons-panel-header">
        <div className="season-tabs" ref={seasonTabsRef}>
          {mainSeasons.map(s => (
            <button
              key={s.season_number}
              className={`season-tab${activeSn === s.season_number ? ' season-tab--active' : ''}`}
              onClick={() => selectSeason(s.season_number)}
            >
              Season {s.season_number}
            </button>
          ))}
        </div>

        <div className="ep-arrows">
          <button className="ep-arrow" onClick={() => scrollSeasons(-1)} aria-label="Previous seasons">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button className="ep-arrow" onClick={() => scrollSeasons(1)} aria-label="Next seasons">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>

      {/* Season meta + episode arrows */}
      <div className="season-meta-row">
        {activeSeason && (
          <div className="season-panel-meta">
            {activeSeason.air_date && (
              <span>{new Date(activeSeason.air_date).getFullYear()}</span>
            )}
            <span>{activeSeason.episode_count} episodes</span>
            {activeSeason.vote_average > 0 && (
              <span className="season-panel-rating">★ {activeSeason.vote_average.toFixed(1)}</span>
            )}
            {user && episodes.length > 0 && watchedInSeason > 0 && (
              <span className="season-progress-chip">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="10" height="10"><polyline points="2 8 6 12 14 4"/></svg>
                {watchedInSeason} / {episodes.length} watched
              </span>
            )}
          </div>
        )}
        <div className="ep-arrows">
          <button className="ep-arrow" onClick={() => scrollEps(-1)} aria-label="Scroll episodes left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button className="ep-arrow" onClick={() => scrollEps(1)} aria-label="Scroll episodes right">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>

      {/* Episodes */}
      {isLoading ? (
        <div className="ep-scroll ep-scroll--skeleton">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="ep-card">
              <div className="ep-thumb ep-thumb--skeleton" />
              <div className="ep-skeleton-line ep-skeleton-line--short" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="ep-scroll" ref={scrollRef}>
            {episodes.map(ep => {
              const epWatched = watchedEps.has(`S${activeSn}E${ep.episode_number}`)
              return (
                <div
                  key={ep.id}
                  className={`ep-card${activeEp?.id === ep.id ? ' ep-card--active' : ''}${epWatched ? ' ep-card--watched' : ''}`}
                  onMouseEnter={IS_HOVER_DEVICE && ep.overview ? () => showPanel(ep) : undefined}
                  onMouseLeave={IS_HOVER_DEVICE && ep.overview ? () => hidePanel() : undefined}
                  onClick={() => activeEp?.id === ep.id ? hidePanel() : showPanel(ep)}
                >
                  <div className="ep-thumb">
                    <img
                      src={ep.still_path
                        ? `https://image.tmdb.org/t/p/w300/${ep.still_path}`
                        : '/No-Poster.png'}
                      alt={ep.name}
                      loading="lazy"
                    />
                    <div className="ep-thumb-overlay">
                      <span className="ep-num">E{ep.episode_number}</span>
                      <span className="ep-thumb-name">{ep.name}</span>
                    </div>
                    {ep.vote_average > 0 && ep.vote_count > 10 && (
                      <div className="ep-rating">
                        <svg viewBox="0 0 20 20" fill="#f5c518"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                        {ep.vote_average.toFixed(1)}
                      </div>
                    )}
                    {user && (
                      <button
                        className={`ep-watched-btn${epWatched ? ' ep-watched-btn--on' : ''}`}
                        onClick={(e) => toggleEpisode(ep, e)}
                        aria-label={epWatched ? 'Mark unwatched' : 'Mark watched'}
                        title={epWatched ? 'Mark as unwatched' : 'Mark as watched'}
                      >
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="2 8 6 12 14 4"/>
                        </svg>
                      </button>
                    )}
                  </div>
                  {ep.runtime > 0 && (
                    <span className="ep-runtime">{ep.runtime}m</span>
                  )}
                </div>
              )
            })}
          </div>
          {(activeEp || panelHiding) && (() => {
            const ep = lastEpRef.current
            return (
              <div className={`ep-detail-panel${panelHiding ? ' ep-detail-panel--hiding' : ''}`}>
                <div className="ep-detail-header">
                  <span className="ep-detail-num">E{ep.episode_number}</span>
                  <span className="ep-detail-title">{ep.name}</span>
                  <div className="ep-detail-meta">
                    {ep.air_date && <span>{new Date(ep.air_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                    {ep.runtime > 0 && <span>{ep.runtime}m</span>}
                    {ep.vote_average > 0 && ep.vote_count > 10 && (
                      <span className="ep-detail-rating">★ {ep.vote_average.toFixed(1)}</span>
                    )}
                  </div>
                </div>
                {ep.overview && <p className="ep-detail-overview">{ep.overview}</p>}
              </div>
            )
          })()}
        </>
      )}

    </div>
  )
}

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

export default function TVDetails({ routeId } = {}) {
  const { id: paramId } = useParams() || {}
  const id = routeId || paramId
  const { user } = useAuth()
  const [isDesktop, setIsDesktop] = useState(false)
  const [show, setShow]               = useState(null)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1200px)')
    setIsDesktop(mq.matches)
    const handler = (e) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  usePageMeta(
    show?.name,
    show?.overview,
    show?.backdrop_path ? `https://image.tmdb.org/t/p/w780${show.backdrop_path}` : undefined
  )
  const [cast, setCast]               = useState([])
  const [crew, setCrew]               = useState([])
  const [trailer, setTrailer]         = useState(null)
  const [videos, setVideos]           = useState([])
  const [images, setImages]           = useState([])
  const [certification, setCert]      = useState(null)
  const [watchProviders, setWatch]    = useState(null)
  const [isLoading, setIsLoading]     = useState(true)
  const [error, setError]             = useState('')
  const [recs, setRecs]               = useState([])
  const [tmdbReviews, setTmdbReviews] = useState([])
  const [externalIds, setExternalIds] = useState(null)
  const recsRef                       = useRef(null)
  const [showPoster, setShowPoster]     = useState(false)
  const [mounted,    setMounted]        = useState(false)
  const [showPicker, setShowPicker]     = useState(false)
  const [pickerRect, setPickerRect]     = useState(null)
  const [saved, setSaved]               = useState(false)
  const [favorited, setFavorited]       = useState(false)
  const [watched, setWatched]           = useState(false)
  const [showAuth, setShowAuth]         = useState(false)

  useEffect(() => { scrollToTop() }, [id])
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!user) { setSaved(false); setFavorited(false); setWatched(false); return }
    Promise.all([getUserSavedMovieIds(user.id), getUserFavoriteIds(user.id), getWatchedIds(user.id)])
      .then(([savedIds, favIds, watchedIds]) => {
        setSaved(savedIds.has(`tv-${id}`))
        setFavorited(favIds.has(`tv-${id}`))
        setWatched(watchedIds.has(`tv-${id}`))
      })
      .catch(() => {})
  }, [user, id])

  const handleFavorite = useCallback(async () => {
    if (!user) { setShowAuth(true); return }
    const next = !favorited
    setFavorited(next)
    try {
      if (next) await addToFavorites(user.id, `tv-${show?.id}`, show?.name, show?.poster_path, 'tv')
      else       await removeFromFavorites(user.id, `tv-${show?.id}`)
    } catch { setFavorited(!next) }
  }, [user, favorited, show])

  const handleWatched = useCallback(async () => {
    if (!user) { setShowAuth(true); return }
    const next = !watched
    setWatched(next)
    try {
      if (next) {
        await addToWatched(user.id, `tv-${show?.id}`, show?.name, show?.poster_path, 'tv')
        showToast('Added to your diary')
      } else {
        await removeFromWatched(user.id, `tv-${show?.id}`)
      }
    } catch { setWatched(!next) }
  }, [user, watched, show])

  const handleShare = useCallback(async () => {
    const title = show?.name || 'this show'
    const url   = window.location.href
    if (navigator.share) {
      try { await navigator.share({ title, url }) } catch {
        // User cancelled native share.
      }
    } else {
      await navigator.clipboard.writeText(url)
      showToast('Link copied!')
    }
  }, [show])

  useEffect(() => {
    let cancelled = false
    const fetchAll = async () => {
      setIsLoading(true)
      setError('')
      try {
        // One request via append_to_response — 5× fewer round trips.
        const data = await cachedFetch(
          `${API_BASE_URL}/tv/${id}?append_to_response=credits,videos,images,content_ratings,watch/providers,recommendations,reviews,external_ids&include_image_language=en,null`,
          API_OPTIONS, TTL.detail
        )
        if (cancelled) return

        const usRating = (data.content_ratings?.results || []).find(r => r.iso_3166_1 === 'US')
        setCert(usRating?.rating || null)
        setWatch(data['watch/providers']?.results?.[WATCH_REGION] || null)
        setShow(data)
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
        setExternalIds(data.external_ids || null)
      } catch {
        if (!cancelled) setError('Could not load show details.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    fetchAll()
    return () => { cancelled = true }
  }, [id])

  const handlePickerClose = useCallback(() => setShowPicker(false), [])
  const renderCastCard = useCallback((member) => (
    <Link key={member.id} href={`/person/${member.id}`} className="person-thumb">
      <PersonAvatar profilePath={member.profile_path} name={member.name} />
      <p className="cast-name">{member.name}</p>
      <p className="cast-character">{member.character}</p>
    </Link>
  ), [])
  const renderCrewCard = useCallback((member) => (
    <Link key={`${member.id}-${member.job}`} href={`/person/${member.id}`} className="person-thumb">
      <PersonAvatar profilePath={member.profile_path} name={member.name} />
      <p className="cast-name">{member.name}</p>
      <p className="cast-character">{member.job}</p>
    </Link>
  ), [])

  if (isLoading) return <MovieDetailsSkeleton />

  if (error || !show) {
    return <ErrorState message={error || "This show doesn't exist or the link has expired."} />
  }

  const posterUrl   = show.poster_path   ? `https://image.tmdb.org/t/p/w500/${show.poster_path}`   : '/No-Poster.png'
  const backdropUrl = show.backdrop_path ? `https://image.tmdb.org/t/p/w1280/${show.backdrop_path}` : null
  const episodeRuntime = show.episode_run_time?.[0]
  const runtime = episodeRuntime ? `${episodeRuntime}m / ep` : null

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
          <img src={posterUrl} alt={show.name} className="mob-hero-poster" onClick={() => setShowPoster(true)} />
        </div>
        <div className="mob-hero-info">
          <div className="mob-hero-text">
            <h1 className="mob-hero-title">{show.name}</h1>
            <div className="mob-info-chips">
              {show.vote_average > 0 && (
                <span className="mob-chip mob-chip--rating">
                  <svg viewBox="0 0 20 20" fill="#f5c518" className="mob-star-icon"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  {show.vote_average.toFixed(1)}
                </span>
              )}
              {certification && <span className="mob-chip">{certification}</span>}
              {runtime && <span className="mob-chip">{runtime}</span>}
              {show.original_language && <span className="mob-chip">{LANG_NAMES[show.original_language] || show.original_language.toUpperCase()}</span>}
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
              className={`mob-icon-btn${watched ? ' mob-icon-btn--watched' : ''}`}
              onClick={handleWatched}
              aria-label={watched ? 'Remove from watch diary' : 'Mark as watched'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {watched
                  ? <path d="M20 6 9 17l-5-5"/>
                  : <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>}
              </svg>
            </button>
          )}
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

        {/* ── Mobile stats strip ── */}
        <div className="mob-stats-strip">
          {show.first_air_date && (
            <div className="mob-stat">
              <span className="mob-stat-label">First Aired</span>
              <span className="mob-stat-value">{new Date(show.first_air_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          )}
          {show.genres?.length > 0 && (
            <div className="mob-stat">
              <span className="mob-stat-label">Genre</span>
              <span className="mob-stat-value">{show.genres.map(g => g.name).join(', ')}</span>
            </div>
          )}
          {show.number_of_seasons > 0 && (
            <div className="mob-stat">
              <span className="mob-stat-label">Seasons</span>
              <span className="mob-stat-value">{show.number_of_seasons}</span>
            </div>
          )}
          {show.number_of_episodes > 0 && (
            <div className="mob-stat">
              <span className="mob-stat-label">Episodes</span>
              <span className="mob-stat-value">{show.number_of_episodes}</span>
            </div>
          )}
          <div className="mob-stat mob-stat--providers">
            <span className="mob-stat-label">Where to Watch</span>
            <WatchProviderList providers={watchProviders} title={show.name} compact />
          </div>
        </div>

        {/* ── Two-column layout: main content + recs sidebar ── */}
        <div className="detail-layout">

        {/* Title row spans both columns so hero + sidebar start on the same line */}
        <div className="detail-title-row">

          {/* Left: title + meta — wraps freely */}
          <div className="detail-title-body">
            <h1 className="detail-title">{show.name}</h1>
            <span className="detail-title-sep" />
            <span className="detail-title-rating">
              <svg viewBox="0 0 20 20" fill="#f5c518" className="meta-icon" style={{ width: 26, height: 26 }}><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              {show.vote_average?.toFixed(1) || 'N/A'}
            </span>
            {show.genres?.length > 0 && (
              <div className="genres">
                {show.genres.map((g) => (
                  <span key={g.id} className="genre-tag">{g.name}</span>
                ))}
              </div>
            )}
          </div>

          {/* Right: share only — primary actions live in the sidebar card */}
          <div className="detail-title-actions">
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
          </div>

          {showPicker && show && (
            <PlaylistPicker
              anchorRect={pickerRect}
              movieId={`tv-${show.id}`}
              movieTitle={show.name}
              moviePosterPath={show.poster_path}
              mediaType="tv"
              onSavedChange={setSaved}
              onClose={handlePickerClose}
            />
          )}
        </div>{/* end detail-title-row */}

        <div className="detail-main">

        {/* ── Hero grid ── */}
        <div className="detail-hero">

          <div className="detail-hero-poster" onClick={() => setShowPoster(true)}>
            <img src={posterUrl} alt={show.name} />
          </div>

          {trailer ? (
            <div className="detail-bento-trailer">
              <TrailerEmbed videoKey={trailer.key} title={trailer.name} />
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

              <div className="detail-stats-bar">
                {show.first_air_date && (
                  <div className="detail-stat-item">
                    <svg viewBox="0 0 20 20" fill="#AB8BFF" className="meta-icon"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/></svg>
                    <p className="detail-stat-value">{new Date(show.first_air_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                )}
                {show.number_of_seasons > 0 && (
                  <div className="detail-stat-item">
                    <svg viewBox="0 0 20 20" fill="#60a5fa" className="meta-icon"><path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 100-4V6z"/></svg>
                    <p className="detail-stat-value">{show.number_of_seasons} {show.number_of_seasons === 1 ? 'Season' : 'Seasons'}</p>
                  </div>
                )}
                {show.number_of_episodes > 0 && (
                  <div className="detail-stat-item">
                    <svg viewBox="0 0 20 20" fill="#34d399" className="meta-icon"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/></svg>
                    <p className="detail-stat-value">{show.number_of_episodes} Episodes</p>
                  </div>
                )}
                {show.original_language && (
                  <div className="detail-stat-item">
                    <svg viewBox="0 0 20 20" fill="#34d399" className="meta-icon"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd"/></svg>
                    <p className="detail-stat-value">{LANG_NAMES[show.original_language] || show.original_language.toUpperCase()}</p>
                  </div>
                )}
                {certification && (
                  <div className="detail-stat-item">
                    <svg viewBox="0 0 20 20" fill="#f59e0b" className="meta-icon"><path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd"/></svg>
                    <p className="detail-stat-value">{certification}</p>
                  </div>
                )}
              </div>

              {show.overview && (
                <div className="detail-merged-body">
                  <div className="detail-card-label">Show Description</div>
                  <div className="detail-overview-scroll">
                    <p className="detail-overview-text">{show.overview}</p>
                    {show.tagline && <p className="detail-tagline">"{show.tagline}"</p>}
                    {show.production_companies?.length > 0 && (
                      <p className="detail-production-text">
                        Produced by {show.production_companies.map((c, i) => (
                          <span key={c.id}>
                            {i > 0 && ', '}
                            <Link href={`/company/${c.id}`} className="detail-production-link">{c.name}</Link>
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                  {show.production_companies?.some(c => c.logo_path) && (
                    <div className="detail-production-bar">
                      <div className="detail-production-logos">
                        {show.production_companies.filter(c => c.logo_path).map(c => (
                          <Link key={c.id} href={`/company/${c.id}`} title={c.name} className="detail-production-logo-link">
                            <img src={`https://image.tmdb.org/t/p/w92/${c.logo_path}`} alt={c.name} className="detail-production-logo" />
                          </Link>
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
              <WatchProviderList providers={watchProviders} title={show.name} />
              <button
                className="go-to-reviews-btn"
                onClick={() => scrollToElement(document.getElementById('comments-section'))}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                Reviews for {show.name}
              </button>
            </div>

          </div>

        </div>

        {/* ── Seasons & Episodes ── */}
        {show.seasons?.length > 0 && (
          <SeasonsPanel showId={id} seasons={show.seasons} user={user} />
        )}

        {/* ── Video Gallery ── */}
        <VideoGallery videos={videos} />
        <ImageGallery images={images} />

        {/* ── External Links ── */}
        {externalIds && (externalIds.imdb_id || externalIds.tvdb_id) && (
          <div className="detail-card detail-external-links">
            <span className="detail-card-label">Find on</span>
            <div className="detail-ext-links-row">
              {externalIds.imdb_id && (
                <a href={`https://www.imdb.com/title/${externalIds.imdb_id}`} target="_blank" rel="noopener noreferrer" className="person-ext-link person-ext-link--imdb">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M14.31 9.588v.005c-.077-.048-.227-.07-.42-.07v4.972c.22 0 .372-.028.44-.09.068-.06.108-.262.108-.673V10.29c0-.394-.04-.636-.128-.702zM22 4H2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm-14.5 9.5h-1.5v-5h1.5v5zm3 0H9v-5h1.5v1.5H12V8.5h1.5v5zm4.5 0h-1.388l-.056-.34c-.288.27-.616.404-.984.404-.476 0-.807-.16-.993-.482-.11-.19-.163-.497-.163-.92V9.357c0-.405.056-.7.17-.886.19-.31.525-.466 1.005-.466.36 0 .683.126.965.378V8.5H15v5zm3.5 0h-3v-5h1.5v3.5H19v1.5z"/></svg>
                  IMDB
                </a>
              )}
              <a href={`https://www.themoviedb.org/tv/${id}`} target="_blank" rel="noopener noreferrer" className="person-ext-link">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
                TMDB
              </a>
              {externalIds.imdb_id && (
                <a href={`https://letterboxd.com/search/films/${encodeURIComponent(show?.name || '')}/`} target="_blank" rel="noopener noreferrer" className="person-ext-link">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm-1 14.5l-4-2.5 4-2.5v5zm2 0V11.5l4 2.5-4 2.5z"/></svg>
                  Letterboxd
                </a>
              )}
            </div>
          </div>
        )}

        {/* ── Cast ── */}
        {cast.length > 0 && (
          <PeopleCarousel title="Cast" people={cast} renderCard={renderCastCard} />
        )}

        {/* ── Crew ── */}
        {crew.length > 0 && (
          <PeopleCarousel title="Crew" people={crew} renderCard={renderCrewCard} />
        )}

        {/* ── Comments + TMDB Reviews ── */}
        <CommentsSection movieId={`tv-${id}`} tmdbReviews={tmdbReviews} />

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
                  <Card movie={item} mediaType="tv" />
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
            <WatchProviderList providers={watchProviders} title={show.name} />
          </div>
          {isDesktop && (
            <div className="detail-card detail-actions-card">
              <button className={`detail-action-row${watched ? " detail-action-row--watched" : ""}`} onClick={handleWatched}>
                <span className={`detail-action-icon${watched ? ' detail-action-icon--watched' : ''}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {watched
                      ? <path d="M20 6 9 17l-5-5"/>
                      : <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>}
                  </svg>
                </span>
                {watched ? 'Watched' : 'Mark as Watched'}
              </button>
              <button className={`detail-action-row${favorited ? " detail-action-row--fav" : ""}`} onClick={handleFavorite}>
                <span className={`detail-action-icon${favorited ? ' detail-action-icon--fav' : ''}`}>
                  <svg viewBox="0 0 24 24" fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </span>
                {favorited ? 'In Favourites' : 'Add to Favourites'}
              </button>
              <button
                className={`detail-action-row${saved ? ' detail-action-row--active' : ''}`}
                onClick={e => { if (!user) { setShowAuth(true); return } setPickerRect(e.currentTarget.getBoundingClientRect()); setShowPicker(true) }}
              >
                <span className={`detail-action-icon${saved ? ' detail-action-icon--saved' : ''}`}>
                  <svg viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
                  </svg>
                </span>
                {saved ? 'Saved to List' : 'Add to List'}
              </button>
              <button
                className="detail-action-row detail-action-row--reviews"
                onClick={() => scrollToElement(document.getElementById('comments-section'))}
              >
                <span className="detail-action-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </span>
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
      {mounted && showPoster && show?.poster_path && createPortal(
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
            src={`https://image.tmdb.org/t/p/w780/${show.poster_path}`}
            alt={show.name}
            style={{ maxHeight:'90vh', maxWidth:'min(500px,90vw)', borderRadius:'16px', boxShadow:'0 40px 120px rgba(0,0,0,0.9)' }}
            onClick={e => e.stopPropagation()}
          />
        </div>,
        document.body
      )}
    </main>
  )
}
