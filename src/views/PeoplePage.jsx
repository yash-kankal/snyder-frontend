'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Footer from '../components/Footer'
import Pagination from '../components/Pagination'
import { API_BASE_URL, API_OPTIONS } from '../config'
import { cachedFetch, prefetch, getCached, TTL } from '../lib/apiCache'

function PersonCard({ person }) {
  const router = useRouter()
  const [loaded, setLoaded] = useState(false)

  const knownFor = (person.known_for || [])
    .filter(k => k.title || k.name)
    .slice(0, 2)
    .map(k => k.title || k.name)
    .join(' · ')

  return (
    <button className="people-card" onClick={() => router.push(`/person/${person.id}`)}>
      <div className="people-card-photo-wrap">
        {!loaded && <div className="people-card-skeleton" />}
        <img
          src={`https://image.tmdb.org/t/p/w342${person.profile_path}`}
          alt={person.name}
          className="people-card-photo"
          onLoad={() => setLoaded(true)}
          style={{ opacity: loaded ? 1 : 0 }}
        />
      </div>
      <div className="people-card-info">
        <span className="people-card-name">{person.name}</span>
        {person.known_for_department && (
          <span className="people-card-dept">{person.known_for_department}</span>
        )}
        {knownFor && (
          <span className="people-card-known">{knownFor}</span>
        )}
      </div>
    </button>
  )
}

function PersonCardSkeleton() {
  return (
    <div className="people-card people-card--skeleton">
      <div className="people-card-photo-wrap">
        <div className="people-card-skeleton" />
      </div>
      <div className="people-card-info">
        <div className="people-skeleton-line" style={{ width: '75%', height: 13 }} />
        <div className="people-skeleton-line" style={{ width: '50%', height: 11, marginTop: 4 }} />
        <div className="people-skeleton-line" style={{ width: '90%', height: 10, marginTop: 4 }} />
      </div>
    </div>
  )
}

export default function PeoplePage() {
  const router = useRouter()
  const [people, setPeople]         = useState([])
  const [isLoading, setIsLoading]   = useState(true)
  const [error, setError]           = useState('')
  const [page, setPage]             = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setPeople([])
      setIsLoading(true)
      setError('')

      try {
        const url1 = `${API_BASE_URL}/trending/person/week?page=${page}`
        const data1 = await cachedFetch(url1, API_OPTIONS, TTL.browse)
        if (cancelled) return

        const totalPgs = Math.max(1, Math.min(data1.total_pages ?? 1, 500))
        setTotalPages(totalPgs)

        let filtered = (data1.results || []).filter(p => p.profile_path)

        // If this page doesn't yield 18 with photos, pull from the next TMDB page
        if (filtered.length < 18 && page < totalPgs) {
          const url2 = `${API_BASE_URL}/trending/person/week?page=${page + 1}`
          const data2 = await cachedFetch(url2, API_OPTIONS, TTL.browse)
          if (!cancelled) {
            filtered = [...filtered, ...(data2.results || []).filter(p => p.profile_path)]
          }
        }

        if (!cancelled) {
          setPeople(filtered.slice(0, 18))
          prefetch(`${API_BASE_URL}/trending/person/week?page=${page + 1}`, API_OPTIONS, TTL.browse)
        }
      } catch {
        if (!cancelled) setError('Failed to load people. Please try again.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [page])

  const handlePageChange = (p) => {
    if (p < 1 || p > totalPages) return
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main>
      <div className="pattern" />

      {/* ── Page header ── */}
      <div className="anime-page-header">
        <div className="anime-page-header-inner">
          <div className="anime-page-title-row">
            <button className="anime-page-back" onClick={() => router.back()} aria-label="Go back">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
            <div>
              <h1 className="anime-page-title">Trending People</h1>
              <p className="anime-page-subtitle">Most talked-about actors &amp; directors this week</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="wrapper">
        {error ? (
          <p className="error-msg">{error}</p>
        ) : (
          <>
            <div className="people-page-grid">
              {isLoading
                ? Array.from({ length: 20 }).map((_, i) => <PersonCardSkeleton key={i} />)
                : people.map(person => <PersonCard key={person.id} person={person} />)
              }
            </div>

            {!isLoading && !error && people.length === 0 && (
              <div className="browse-empty">
                <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="22" cy="22" r="14"/>
                  <line x1="32" y1="32" x2="43" y2="43"/>
                  <line x1="18" y1="22" x2="26" y2="22"/>
                  <line x1="22" y1="18" x2="22" y2="26"/>
                </svg>
                <p>No results found</p>
              </div>
            )}

            {!isLoading && totalPages > 1 && (
              <div className="mt-10">
                <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </main>
  )
}
