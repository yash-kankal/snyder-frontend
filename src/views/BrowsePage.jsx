'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Card from '../components/Card'
import CardSkeleton from '../components/CardSkeleton'
import Pagination from '../components/Pagination'
import ComingSoonCard from '../components/ComingSoonCard'
import HeroCarousel from '../components/HeroCarousel'
import Footer from '../components/Footer'
import { API_BASE_URL, API_OPTIONS, WATCH_REGION } from '../config'
import { cachedFetch, prefetch, getCached, TTL } from '../lib/apiCache'

import { showToast } from '../lib/toast'
import { usePageMeta } from '../lib/usePageMeta'
import { useRevealOnScroll } from '../lib/useRevealOnScroll'
import { getUserReminderIds, addReminder, removeReminder, getShowsEpisodeCounts } from '../lib/movieActions'
import { useAuth } from '../contexts/AuthContext'
import AuthModal from '../components/AuthModal'

const hideBrokenImage = (e) => { e.currentTarget.style.display = 'none' }

const svgProps = {
  viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
  className: 'browse-tab-icon',
}
const IconComingSoon = () => (
  <svg {...svgProps}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M12 14v3M10.5 15.5h3"/></svg>
)
const IconTrending = () => (
  <svg {...svgProps}><path d="M3 17l6-6 4 4 8-8"/><path d="M17 7h4v4"/></svg>
)
const IconAll = () => (
  <svg {...svgProps}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
)
const IconFilm = () => (
  <svg {...svgProps}><rect x="2" y="2" width="20" height="20" rx="2.5"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M17 7h5M2 17h5M17 17h5"/></svg>
)
const IconTV = () => (
  <svg {...svgProps}><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>
)

const PROVIDERS = [
  { id: '',     label: 'All Platforms',  region: ''   },
  // Global / Multi-region
  { id: '8',    label: 'Netflix',        region: 'IN' },
  { id: '119',  label: 'Amazon Prime',   region: 'IN' },
  { id: '350',  label: 'Apple TV+',      region: 'IN' },
  { id: '283',  label: 'Crunchyroll',    region: 'IN' },
  { id: '11',   label: 'MUBI',           region: 'IN' },
  // India
  { id: '2336', label: 'JioHotstar',     region: 'IN' },
  { id: '237',  label: 'SonyLIV',        region: 'IN' },
  { id: '232',  label: 'ZEE5',           region: 'IN' },
  { id: '309',  label: 'Sun NXT',        region: 'IN' },
  // US
  { id: '337',  label: 'Disney+',        region: 'US' },
  { id: '384',  label: 'HBO Max',        region: 'US' },
  { id: '15',   label: 'Hulu',           region: 'US' },
  { id: '386',  label: 'Peacock',        region: 'US' },
  { id: '531',  label: 'Paramount+',     region: 'US' },
]

const MOVIE_GENRES = [
  { id: '',      label: 'All Genres' },
  { id: '28',    label: 'Action' },
  { id: '12',    label: 'Adventure' },
  { id: '16',    label: 'Animation' },
  { id: '35',    label: 'Comedy' },
  { id: '80',    label: 'Crime' },
  { id: '99',    label: 'Documentary' },
  { id: '18',    label: 'Drama' },
  { id: '10751', label: 'Family' },
  { id: '14',    label: 'Fantasy' },
  { id: '36',    label: 'History' },
  { id: '27',    label: 'Horror' },
  { id: '9648',  label: 'Mystery' },
  { id: '10749', label: 'Romance' },
  { id: '878',   label: 'Sci-Fi' },
  { id: '53',    label: 'Thriller' },
  { id: '10752', label: 'War' },
  { id: '37',    label: 'Western' },
]

const TV_GENRES = [
  { id: '',      label: 'All Genres' },
  { id: '10759', label: 'Action & Adventure' },
  { id: '16',    label: 'Animation' },
  { id: '35',    label: 'Comedy' },
  { id: '80',    label: 'Crime' },
  { id: '99',    label: 'Documentary' },
  { id: '18',    label: 'Drama' },
  { id: '10751', label: 'Family' },
  { id: '10762', label: 'Kids' },
  { id: '9648',  label: 'Mystery' },
  { id: '10765', label: 'Sci-Fi & Fantasy' },
  { id: '10768', label: 'War & Politics' },
  { id: '37',    label: 'Western' },
]

const LANGUAGES = [
  { id: '',   label: 'All Languages' },
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'Hindi' },
  { id: 'ko', label: 'Korean' },
  { id: 'ja', label: 'Japanese' },
  { id: 'es', label: 'Spanish' },
  { id: 'fr', label: 'French' },
  { id: 'de', label: 'German' },
  { id: 'it', label: 'Italian' },
  { id: 'pt', label: 'Portuguese' },
  { id: 'zh', label: 'Chinese' },
  { id: 'ta', label: 'Tamil' },
  { id: 'te', label: 'Telugu' },
  { id: 'ml', label: 'Malayalam' },
  { id: 'bn', label: 'Bengali' },
  { id: 'ru', label: 'Russian' },
  { id: 'ar', label: 'Arabic' },
  { id: 'tr', label: 'Turkish' },
]

function getUpcomingDateRange() {
  const today  = new Date().toISOString().split('T')[0]
  const future = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  return { today, future }
}

// ── Coming Soon reminder helpers (localStorage — logged-out fallback) ─────────
const CS_REMINDERS_KEY = 'cuedup_reminders'
function getLsReminders() {
  try { return new Set(JSON.parse(localStorage.getItem(CS_REMINDERS_KEY) || '[]')) }
  catch { return new Set() }
}

// ── Fuzzy search helpers ────────────────────────────────────────────────────
function getQueryVariants(raw) {
  const q = raw?.trim()
  if (!q) return [q]
  const set = new Set([q])
  const words = q.split(/\s+/)

  const stripped = words.map(w => /[^aeiou\s]h$/i.test(w) ? w.slice(0, -1) : w).join(' ')
  if (stripped !== q) set.add(stripped)

  const looksHindi = words.some(w => /^(bh|gh|kh|dh|ph|ch|jh|sh|rh)/i.test(w))
  if (looksHindi) {
    const extended = words.map(w => /[tdnkgpb]$/i.test(w) ? w + 'h' : w).join(' ')
    if (extended !== q) set.add(extended)
  }

  const normed = q
    .replace(/([aeiou])\1+/gi, '$1')
    .replace(/([bcdfghjklmnpqrstvwxyz])\1+/gi, '$1')
  if (normed !== q) set.add(normed)

  return [...set].slice(0, 3)
}

function mergeSearchResults(pages) {
  const seen = new Set()
  const merged = []
  for (const page of pages) {
    for (const item of (page?.results || [])) {
      const key = `${item.media_type || 'unknown'}-${item.id}`
      if (!seen.has(key)) { seen.add(key); merged.push(item) }
    }
  }
  return merged.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
}

function getEndpoint(section, query, pageNum, ratingSort, provider, genre, tab, language, watchRegion = WATCH_REGION) {
  const isTV = section === 'tv'
  const mediaType = isTV ? 'tv' : 'movie'

  if (query?.trim()) {
    return `${API_BASE_URL}/search/multi?query=${encodeURIComponent(query)}&page=${pageNum}`
  }

  const effectiveProvider   = provider
  const effectiveRatingSort = (tab === 'coming_soon' || tab === 'now_playing') ? '' : ratingSort

  const needsDiscover = effectiveRatingSort || effectiveProvider || genre || language
  if (needsDiscover) {
    const sortBy = effectiveRatingSort ? `vote_average.${effectiveRatingSort}` : 'popularity.desc'
    let url = `${API_BASE_URL}/discover/${mediaType}?page=${pageNum}&sort_by=${sortBy}`
    if (effectiveRatingSort)  url += `&vote_count.gte=150`
    if (effectiveProvider)    url += `&with_watch_providers=${effectiveProvider}&watch_region=${watchRegion}`
    if (genre)                url += `&with_genres=${genre}`
    if (language)             url += `&with_original_language=${language}`
    if (tab === 'coming_soon') {
      const { today, future } = getUpcomingDateRange()
      url += isTV
        ? `&first_air_date.gte=${today}&first_air_date.lte=${future}`
        : `&primary_release_date.gte=${today}&primary_release_date.lte=${future}`
    }
    return url
  }

  if (tab === 'coming_soon') {
    const { today, future } = getUpcomingDateRange()
    const dateKey = isTV ? 'first_air_date' : 'primary_release_date'
    return `${API_BASE_URL}/discover/${mediaType}?page=${pageNum}&sort_by=popularity.desc&${dateKey}.gte=${today}&${dateKey}.lte=${future}`
  }

  if (isTV) return `${API_BASE_URL}/tv/popular?page=${pageNum}`
  return `${API_BASE_URL}/discover/movie?sort_by=popularity.desc&page=${pageNum}`
}

function getSectionTitle(section, query, tab) {
  if (query) return `Results for "${query}"`
  if (section === 'anime') {
    if (tab === 'anime_movies') return 'Anime Movies'
    if (tab === 'anime_tv')    return 'Anime TV Shows'
    return 'Popular Anime'
  }
  if (tab === 'coming_soon') return section === 'tv' ? 'Coming Soon Shows' : 'Coming Soon Movies'
  if (section === 'tv') return 'Popular TV Shows'
  return 'Popular Movies'
}

function processPage(data) {
  return {
    results:      data.results ?? [],
    totalPages:   Math.max(1, Math.min(data.total_pages   ?? 1, 500)),
  }
}


function PopularTVRow() {
  const scrollRef = useRef(null)
  const [shows, setShows]                 = useState([])
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])
  const scroll = (dir) => scrollRef.current?.scrollBy({ left: dir * 600, behavior: 'smooth' })

  useEffect(() => {
    let t
    cachedFetch(`${API_BASE_URL}/tv/popular?page=1`, API_OPTIONS, TTL.browse)
      .then(data => {
        const filtered = (data.results || [])
          .filter(s => s.backdrop_path)
          .slice(0, 16)
        setShows(filtered)
        t = setTimeout(checkScroll, 50)
      })
      .catch(() => {
        // This row is optional; leave it hidden if the fetch fails.
      })
    return () => clearTimeout(t)
  }, [checkScroll])

  if (!shows.length) return null

  return (
    <div className="fran-browse-section">
      <div className="fran-browse-inner">
        <div className="fran-browse-header">
          <div className="fran-browse-header-left">
            <h2 className="fran-browse-title">Popular TV Shows</h2>
          </div>
          <div className="fran-browse-nav">
            <button className="fran-browse-arrow" onClick={() => scroll(-1)} disabled={!canScrollLeft}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <button className="fran-browse-arrow" onClick={() => scroll(1)} disabled={!canScrollRight}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="fran-browse-scroll" ref={scrollRef} onScroll={checkScroll}>
          {shows.map(show => (
            <Link
              key={show.id}
              href={`/tv/${show.id}`}
              className="fran-browse-card"
            >
              <img
                src={`https://image.tmdb.org/t/p/w780${show.backdrop_path}`}
                alt={show.name}
                className="fran-browse-card-bg"
                loading="lazy"
                onError={hideBrokenImage}
              />
              <div className="fran-browse-card-body">
                <span className="fran-browse-card-name">{show.name}</span>
                <span className="fran-browse-card-tag">
                  {show.first_air_date ? show.first_air_date.split('-')[0] : ''}
                  {show.vote_average > 0 ? ` · ★ ${show.vote_average.toFixed(1)}` : ''}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function PopularAnimeRow() {
  const router = useRouter()
  const scrollRef = useRef(null)
  const [shows, setShows]                   = useState([])
  const [canScrollLeft, setCanScrollLeft]   = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])
  const scroll = (dir) => scrollRef.current?.scrollBy({ left: dir * 600, behavior: 'smooth' })

  useEffect(() => {
    let t
    cachedFetch(
      `${API_BASE_URL}/discover/tv?with_genres=16&with_origin_country=JP&sort_by=popularity.desc&page=1`,
      API_OPTIONS, TTL.browse
    )
      .then(data => {
        const filtered = (data.results || [])
          .filter(s => s.backdrop_path)
          .slice(0, 16)
        setShows(filtered)
        t = setTimeout(checkScroll, 50)
      })
      .catch(() => {
        // This row is optional; leave it hidden if the fetch fails.
      })
    return () => clearTimeout(t)
  }, [checkScroll])

  if (!shows.length) return null

  return (
    <div className="fran-browse-section">
      <div className="fran-browse-inner">
        <div className="fran-browse-header">
          <div className="fran-browse-header-left">
            <h2 className="fran-browse-title">Popular Anime</h2>
            <button
              className="fran-browse-see-all"
              onClick={() => { router.push('/anime'); window.scrollTo({ top: 0, behavior: 'instant' }) }}
            >
              See All <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 14, height: 14, display: 'inline', verticalAlign: 'middle' }}><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/></svg>
            </button>
          </div>
          <div className="fran-browse-nav">
            <button className="fran-browse-arrow" onClick={() => scroll(-1)} disabled={!canScrollLeft}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <button className="fran-browse-arrow" onClick={() => scroll(1)} disabled={!canScrollRight}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="fran-browse-scroll" ref={scrollRef} onScroll={checkScroll}>
          {shows.map(show => (
            <Link
              key={show.id}
              href={`/tv/${show.id}`}
              className="fran-browse-card"
            >
              <img
                src={`https://image.tmdb.org/t/p/w780${show.backdrop_path}`}
                alt={show.name}
                className="fran-browse-card-bg"
                loading="lazy"
                onError={hideBrokenImage}
              />
              <div className="fran-browse-card-body">
                <span className="fran-browse-card-name">{show.name}</span>
                <span className="fran-browse-card-tag">
                  {show.first_air_date ? show.first_air_date.split('-')[0] : ''}
                  {show.vote_average > 0 ? ` · ★ ${show.vote_average.toFixed(1)}` : ''}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function BrowsePage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // ── All filter state lives in the URL so browser back restores everything ──
  const section    = searchParams.get('section')    || 'movies'
  const urlQuery   = searchParams.get('q')          || ''
  const genre      = searchParams.get('genre')      || ''
  const provider   = searchParams.get('provider')   || ''
  const ratingSort = searchParams.get('ratingSort') || ''
  const language   = searchParams.get('language')   || ''
  const tab        = searchParams.get('tab')        || 'now_playing'
  const page       = Math.max(1, parseInt(searchParams.get('page') || '1', 10))

  // Use the provider's own region so US platforms (Hulu, HBO Max, etc.) return results
  const providerRegion = PROVIDERS.find(p => p.id === provider)?.region || WATCH_REGION

  // ── Local state only for fetched results ───────────────────────────────────
  const [movieList, setMovieList]       = useState([])
  const [isLoading, setIsLoading]       = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [totalPages, setTotalPages]     = useState(1)
  const [epProgress, setEpProgress]     = useState(new Map())

  // Ref to scroll back to the grid (not the hero) when changing pages
  const gridRef = useRef(null)
  const listRef = useRef(null)
  useRevealOnScroll(listRef, [movieList, isLoading, tab, section])

  // ── Coming Soon reminder state ────────────────────────────────────────────
  const { user } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const [csReminders, setCsReminders] = useState(getLsReminders)

  // Load from DB when user becomes known; fall back to localStorage when logged out
  useEffect(() => {
    if (!user) { setCsReminders(getLsReminders()); return }
    getUserReminderIds(user.id).then(ids => setCsReminders(new Set(ids)))
  }, [user])

  const handleCsRemind = useCallback(async (item) => {
    if (!user) { setShowAuth(true); return }
    const id    = String(item.id)
    const title = item.title || item.name
    const isOn  = csReminders.has(id)
    const next  = new Set(csReminders)
    if (isOn) { next.delete(id); showToast(`Reminder removed for "${title}"`) }
    else       { next.add(id);   showToast(`Reminder set for "${title}" 🔔`) }
    setCsReminders(next)
    try {
      const date = item.release_date || item.first_air_date || null
      const mt   = section === 'tv' ? 'tv' : 'movie'
      if (isOn) await removeReminder(user.id, id)
      else      await addReminder(user.id, id, title, item.poster_path, mt, date)
    } catch { setCsReminders(csReminders) }  // revert on error
  }, [user, csReminders, section])

  // ── Episode progress for TV cards ────────────────────────────────────────────
  useEffect(() => {
    if (!user || section !== 'tv' || !movieList.length) { setEpProgress(new Map()); return }
    const showIds = movieList.map(item => String(item.id))
    getShowsEpisodeCounts(user.id, showIds)
      .then(counts => setEpProgress(counts))
      .catch(() => {})
  }, [user, section, movieList])

  // ── Email-verification toast (run once on mount) ───────────────────────────
  useEffect(() => {
    if (searchParams.get('verified') === '1') {
      showToast('Email successfully verified!')
      const next = new URLSearchParams(searchParams.toString())
      next.delete('verified')
      router.replace(`/browse?${next.toString()}`, { scroll: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── URL-param helpers ──────────────────────────────────────────────────────
  const setFilter = useCallback((key, val) => {
    const next = new URLSearchParams(searchParams.toString())
    val ? next.set(key, val) : next.delete(key)
    next.delete('page')
    router.replace(`/browse?${next.toString()}`, { scroll: false })
  }, [searchParams, router])

  const handleTabChange = useCallback((newTab) => {
    const next = new URLSearchParams(searchParams.toString())
    newTab === 'now_playing' ? next.delete('tab') : next.set('tab', newTab)
    if (newTab === 'coming_soon' || newTab === 'now_playing') { next.delete('ratingSort') }
    next.delete('page')
    router.replace(`/browse?${next.toString()}`, { scroll: false })
  }, [searchParams, router])

  const handlePageChange = useCallback((p) => {
    const next = new URLSearchParams(searchParams.toString())
    p <= 1 ? next.delete('page') : next.set('page', String(p))
    router.replace(`/browse?${next.toString()}`, { scroll: false })
    // Scroll so the tabs sit just below the fixed navbar (~72px)
    if (gridRef.current) {
      const top = gridRef.current.getBoundingClientRect().top + window.scrollY - 88
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }, [searchParams, router])

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    // ── Anime: parallel movie + TV fetch, combined by popularity ──────────────
    if (section === 'anime' && !urlQuery) {
      const base = `with_genres=16&with_origin_country=JP&sort_by=popularity.desc&page=${page}`
      const onlyMovies = tab === 'anime_movies'
      const onlyTV     = tab === 'anime_tv'
      const movieUrl = `${API_BASE_URL}/discover/movie?${base}`
      const tvUrl    = `${API_BASE_URL}/discover/tv?${base}`

      const movieHit = !onlyTV    ? getCached(movieUrl, TTL.browse) : { results: [], total_pages: 1 }
      const tvHit    = !onlyMovies ? getCached(tvUrl,    TTL.browse) : { results: [], total_pages: 1 }

      if (movieHit && tvHit) {
        const combined = [
          ...(!onlyTV    ? (movieHit.results || []).map(m => ({ ...m, media_type: 'movie' })) : []),
          ...(!onlyMovies ? (tvHit.results    || []).map(t => ({ ...t, media_type: 'tv'    })) : []),
        ].sort((a, b) => b.popularity - a.popularity)
        setMovieList(combined)
        setTotalPages(Math.max(1, Math.min(Math.max(movieHit.total_pages || 1, tvHit.total_pages || 1), 500)))
        setIsLoading(false)
        setErrorMessage('')
        return
      }

      setMovieList([])
      setIsLoading(true)
      setErrorMessage('')

      const fetches = []
      if (!onlyTV)     fetches.push(cachedFetch(movieUrl, API_OPTIONS, TTL.browse))
      if (!onlyMovies) fetches.push(cachedFetch(tvUrl,    API_OPTIONS, TTL.browse))

      Promise.all(fetches)
        .then(results => {
          if (cancelled) return
          const movieData = !onlyTV     ? results[0]                    : null
          const tvData    = !onlyMovies ? results[onlyTV ? 0 : 1]       : null
          const combined  = [
            ...(movieData?.results || []).map(m => ({ ...m, media_type: 'movie' })),
            ...(tvData?.results    || []).map(t => ({ ...t, media_type: 'tv'    })),
          ].sort((a, b) => b.popularity - a.popularity)
          setMovieList(combined)
          setTotalPages(Math.max(1, Math.min(
            Math.max(movieData?.total_pages || 1, tvData?.total_pages || 1), 500
          )))
        })
        .catch(() => {
          if (cancelled) return
          setErrorMessage('Error fetching anime. Please try again later.')
          setMovieList([])
          setTotalPages(1)
        })
        .finally(() => { if (!cancelled) setIsLoading(false) })

      return () => { cancelled = true }
    }

    // ── Search: parallel variant fetch ───────────────────────────────────────
    if (urlQuery?.trim()) {
      const variants   = getQueryVariants(urlQuery)
      const searchUrls = variants.map(v =>
        `${API_BASE_URL}/search/multi?query=${encodeURIComponent(v)}&page=${page}`
      )

      const cachedPages = searchUrls.map(u => getCached(u, TTL.browse))
      if (cachedPages.every(Boolean)) {
        const merged = mergeSearchResults(cachedPages).filter(r => r.media_type !== 'person')
        setIsLoading(false)
        setMovieList(merged)
        setTotalPages(Math.max(1, Math.min(Math.max(...cachedPages.map(p => p.total_pages || 1)), 500)))
        setErrorMessage('')
        return
      }

      setMovieList([])
      setIsLoading(true)
      setErrorMessage('')

      Promise.all(searchUrls.map(u => cachedFetch(u, API_OPTIONS, TTL.browse)))
        .then(pages => {
          if (cancelled) return
          const merged = mergeSearchResults(pages).filter(r => r.media_type !== 'person')
          setMovieList(merged)
          setTotalPages(Math.max(1, Math.min(Math.max(...pages.map(p => p?.total_pages || 1)), 500)))
        })
        .catch(() => {
          if (cancelled) return
          setErrorMessage('Error fetching results. Please try again later.')
          setMovieList([])
          setTotalPages(1)
        })
        .finally(() => { if (!cancelled) setIsLoading(false) })

      return () => { cancelled = true }
    }

    // ── Normal movies / TV fetch (discover — no query) ────────────────────────
    const url = getEndpoint(section, urlQuery, page, ratingSort, provider, genre, tab, language, providerRegion)

    const hit = getCached(url, TTL.browse)
    if (hit) {
      const p = processPage(hit)
      setIsLoading(false)
      setMovieList(p.results)
      setTotalPages(p.totalPages)
      setErrorMessage('')
      prefetch(getEndpoint(section, urlQuery, page + 1, ratingSort, provider, genre, tab, language, providerRegion), API_OPTIONS, TTL.browse)
      return
    }

    setMovieList([])
    setIsLoading(true)
    setErrorMessage('')

    cachedFetch(url, API_OPTIONS, TTL.browse)
      .then(data => {
        if (cancelled) return
        if (!Array.isArray(data?.results)) {
          setErrorMessage('No results found.')
          setMovieList([])
          setTotalPages(1)
          return
        }
        const p = processPage(data)
        setMovieList(p.results)
        setTotalPages(p.totalPages)
        prefetch(getEndpoint(section, urlQuery, page + 1, ratingSort, provider, genre, tab, language, providerRegion), API_OPTIONS, TTL.browse)
      })
      .catch(() => {
        if (cancelled) return
        setErrorMessage('Error fetching movies. Please try again later.')
        setMovieList([])
        setTotalPages(1)
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })

    return () => { cancelled = true }
  }, [section, urlQuery, page, ratingSort, provider, genre, tab, language, providerRegion])

  const showFilters = !urlQuery && section !== 'anime'
  const showHero    = (section === 'movies' || section === 'tv' || section === 'anime') && !urlQuery

  usePageMeta(
    section === 'anime' ? 'Anime'
      : section === 'tv' ? 'TV Shows'
      : 'Movies'
  )

  return (
    <main>
      {showHero && <HeroCarousel mediaType={section === 'anime' ? 'anime' : section === 'tv' ? 'tv' : 'movie'} />}

      {showHero && section === 'tv'     && <PopularAnimeRow />}
      <div className={`wrapper${showHero ? ' wrapper--after-hero' : ''}`}>
        <section className="all-movies" ref={gridRef}>
          <div className="section-header">
            {urlQuery ? (
              <h2>{getSectionTitle(section, urlQuery, tab)}</h2>
            ) : section === 'anime' ? (
              <div className="browse-tabs">
                <button
                  className={`browse-tab${!tab || tab === 'now_playing' ? ' browse-tab--active' : ''}`}
                  onClick={() => handleTabChange('now_playing')}
                ><IconAll />All</button>
                <button
                  className={`browse-tab${tab === 'anime_movies' ? ' browse-tab--active' : ''}`}
                  onClick={() => handleTabChange('anime_movies')}
                ><IconFilm />Movies</button>
                <button
                  className={`browse-tab${tab === 'anime_tv' ? ' browse-tab--active' : ''}`}
                  onClick={() => handleTabChange('anime_tv')}
                ><IconTV />TV Shows</button>
              </div>
            ) : (
              <div className="browse-tabs">
                {section === 'movies' ? (
                  <>
                    <button
                      className={`browse-tab${!tab || tab === 'now_playing' ? ' browse-tab--active' : ''}`}
                      onClick={() => handleTabChange('now_playing')}
                    ><IconTrending />Popular Movies</button>
                    <button
                      className={`browse-tab${tab === 'coming_soon' ? ' browse-tab--active' : ''}`}
                      onClick={() => handleTabChange('coming_soon')}
                    ><IconComingSoon />Coming Soon</button>
                  </>
                ) : (
                  <>
                    <button
                      className={`browse-tab${!tab || tab === 'now_playing' ? ' browse-tab--active' : ''}`}
                      onClick={() => handleTabChange('now_playing')}
                    ><IconTrending />Popular Shows</button>
                    <button
                      className={`browse-tab${tab === 'coming_soon' ? ' browse-tab--active' : ''}`}
                      onClick={() => handleTabChange('coming_soon')}
                    ><IconComingSoon />Coming Soon</button>
                  </>
                )}
              </div>
            )}

            <div className="section-header-right">
              {showFilters && (
                <>
                  {/* Genre */}
                  <div className="country-filter-wrap">
                    <svg className="country-filter-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
                    </svg>
                    <select className="country-filter" value={genre}
                      onChange={e => setFilter('genre', e.target.value)}>
                      {(section === 'tv' ? TV_GENRES : MOVIE_GENRES).map(g => (
                        <option key={g.id} value={g.id}>{g.label}</option>
                      ))}
                    </select>
                    <svg className="country-filter-chevron" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </div>

                  {/* Language */}
                  <div className="country-filter-wrap">
                    <svg className="country-filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                      <path d="M2 12h20"/>
                    </svg>
                    <select className="country-filter" value={language}
                      onChange={e => setFilter('language', e.target.value)}>
                      {LANGUAGES.map(l => (
                        <option key={l.id} value={l.id}>{l.label}</option>
                      ))}
                    </select>
                    <svg className="country-filter-chevron" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </div>

                  {/* Streaming platform */}
                  <div className="country-filter-wrap">
                    <svg className="country-filter-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 100-4V6z"/>
                    </svg>
                    <select className="country-filter" value={provider}
                      onChange={e => setFilter('provider', e.target.value)}>
                      {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                    <svg className="country-filter-chevron" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </div>

                  {/* Rating sort — hidden on Coming Soon */}
                  {tab !== 'coming_soon' && tab !== 'now_playing' && (
                  <div className="country-filter-wrap">
                    <svg className="country-filter-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                    <select className="country-filter" value={ratingSort}
                      onChange={e => setFilter('ratingSort', e.target.value)}>
                      <option value="">All Ratings</option>
                      <option value="desc">Rating: High → Low</option>
                      <option value="asc">Rating: Low → High</option>
                    </select>
                    <svg className="country-filter-chevron" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  )}

                </>
              )}
            </div>
          </div>

          {errorMessage ? (
            <p className="error-msg">{errorMessage}</p>
          ) : (
            <>
              <ul ref={listRef} key={`${section}-${tab || 'default'}`} className="tab-content-swap">
                {isLoading
                  ? Array.from({ length: 20 }).map((_, i) => <CardSkeleton key={i} />)
                  : tab === 'coming_soon'
                    ? movieList.map(item => (
                        <ComingSoonCard
                          key={item.id}
                          item={item}
                          mediaType={section === 'tv' ? 'tv' : 'movie'}
                          reminded={csReminders.has(String(item.id))}
                          onRemind={handleCsRemind}
                        />
                      ))
                    : movieList.map(item => (
                        <Card key={item.id} movie={item} mediaType={item.media_type || (section === 'tv' ? 'tv' : 'movie')} showNewBadge watchedEpisodes={epProgress.get(String(item.id)) || 0} />
                      ))
                }
              </ul>
              {!isLoading && !errorMessage && movieList.length === 0 && (
                <div className="browse-empty">
                  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="22" cy="22" r="14"/>
                    <line x1="32" y1="32" x2="43" y2="43"/>
                    <line x1="18" y1="22" x2="26" y2="22"/>
                    <line x1="22" y1="18" x2="22" y2="26"/>
                  </svg>
                  <p>No results found</p>
                  <span>Try adjusting your filters or switching tabs</span>
                </div>
              )}
              {!isLoading && totalPages > 1 && (
                <div className="mt-10">
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={p => { if (p >= 1 && p <= totalPages) handlePageChange(p) }}
                  />
                </div>
              )}
            </>
          )}
        </section>
      </div>
      <Footer />
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </main>
  )
}
