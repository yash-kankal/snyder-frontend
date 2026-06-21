'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Card from '../components/Card'
import CardSkeleton from '../components/CardSkeleton'
import Pagination from '../components/Pagination'
import Footer from '../components/Footer'
import { API_BASE_URL, API_OPTIONS } from '../config'
import { cachedFetch, prefetch, getCached, TTL } from '../lib/apiCache'
import { usePageMeta } from '../lib/usePageMeta'
import { useRevealOnScroll } from '../lib/useRevealOnScroll'
import { useAuth } from '../contexts/AuthContext'
import { getShowsEpisodeCounts } from '../lib/movieActions'

const SORT_OPTIONS = [
  { value: 'popularity.desc',    label: 'Most Popular' },
  { value: 'vote_average.desc',  label: 'Highest Rated' },
  { value: 'first_air_date.desc', label: 'Newest First' },
  { value: 'first_air_date.asc', label: 'Oldest First' },
]

function getEndpoint(page, sort) {
  let url = `${API_BASE_URL}/discover/tv?with_genres=16&with_origin_country=JP&sort_by=${sort}&page=${page}`
  if (sort === 'vote_average.desc') url += '&vote_count.gte=100'
  return url
}

export default function AnimePage() {
  const router = useRouter()
  usePageMeta('Anime')
  const { user } = useAuth()

  const [animeList, setAnimeList]   = useState([])
  const [isLoading, setIsLoading]   = useState(false)
  const [error, setError]           = useState('')
  const [page, setPage]             = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [sort, setSort]             = useState('popularity.desc')
  const [epProgress, setEpProgress] = useState(new Map())

  const listRef = useRef(null)
  useRevealOnScroll(listRef, [animeList, isLoading])

  useEffect(() => {
    const url = getEndpoint(page, sort)

    const hit = getCached(url, TTL.browse)
    if (hit) {
      setIsLoading(false)
      setAnimeList(hit.results || [])
      setTotalPages(Math.max(1, Math.min(hit.total_pages ?? 1, 500)))
      setError('')
      prefetch(getEndpoint(page + 1, sort), API_OPTIONS, TTL.browse)
      return
    }

    setAnimeList([])
    setIsLoading(true)
    setError('')

    cachedFetch(url, API_OPTIONS, TTL.browse)
      .then(data => {
        setAnimeList(data.results || [])
        setTotalPages(Math.max(1, Math.min(data.total_pages ?? 1, 500)))
        prefetch(getEndpoint(page + 1, sort), API_OPTIONS, TTL.browse)
      })
      .catch(() => setError('Failed to load anime. Please try again.'))
      .finally(() => setIsLoading(false))
  }, [page, sort])

  useEffect(() => {
    if (!user || !animeList.length) { setEpProgress(new Map()); return }
    const showIds = animeList.map(item => String(item.id))
    getShowsEpisodeCounts(user.id, showIds)
      .then(counts => setEpProgress(counts))
      .catch(() => {})
  }, [user, animeList])

  return (
    <main>


      {/* ── Page header ── */}
      <div className="anime-page-header">
        <div className="anime-page-header-inner">
          <div className="anime-page-title-row">
            <button className="anime-page-back" onClick={() => router.back()} aria-label="Go back">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
            <div>
              <h1 className="anime-page-title">Anime</h1>
            </div>
          </div>

          {/* Sort filter */}
          <div className="anime-page-filters">
            <div className="country-filter-wrap">
              <svg className="country-filter-icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z"/>
              </svg>
              <select
                className="country-filter"
                value={sort}
                onChange={e => { setSort(e.target.value); setPage(1) }}
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <svg className="country-filter-chevron" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="wrapper">
        <section className="all-movies">
          {error ? (
            <p className="error-msg">{error}</p>
          ) : (
            <>
              <ul ref={listRef}>
                {isLoading
                  ? Array.from({ length: 20 }).map((_, i) => <CardSkeleton key={i} />)
                  : animeList.map(item => (
                      <Card key={item.id} movie={item} mediaType="tv" showNewBadge watchedEpisodes={epProgress.get(String(item.id)) || 0} />
                    ))
                }
              </ul>
              {!isLoading && !error && animeList.length === 0 && (
                <div className="browse-empty">
                  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="22" cy="22" r="14"/>
                    <line x1="32" y1="32" x2="43" y2="43"/>
                  </svg>
                  <p>No results found</p>
                </div>
              )}
              {!isLoading && totalPages > 1 && (
                <div className="mt-10">
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={p => {
                      if (p >= 1 && p <= totalPages) {
                        setPage(p)
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }
                    }}
                  />
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <Footer />
    </main>
  )
}
