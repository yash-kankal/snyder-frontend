'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Card from '../components/Card'
import CardSkeleton from '../components/CardSkeleton'
import { useRevealOnScroll } from '../lib/useRevealOnScroll'
import Pagination from '../components/Pagination'
import Footer from '../components/Footer'
import { API_BASE_URL, API_OPTIONS } from '../config'
import { cachedFetch, prefetch, getCached, TTL } from '../lib/apiCache'
import { CURATED_COLLECTIONS } from '../data/collections'

export default function CollectionDetailPage() {
  const { slug } = useParams()
  const router = useRouter()

  const collection = CURATED_COLLECTIONS.find(c => c.slug === slug)

  const [items, setItems]           = useState([])
  const [isLoading, setIsLoading]   = useState(false)

  const listRef = useRef(null)
  useRevealOnScroll(listRef, [items, isLoading])
  const [error, setError]           = useState('')
  const [page, setPage]             = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (!collection) return
    setPage(1)
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!collection) return

    const url = `${API_BASE_URL}/${collection.endpoint(page)}`

    const hit = getCached(url, TTL.browse)
    if (hit) {
      setIsLoading(false)
      setItems(hit.results || [])
      setTotalPages(Math.max(1, Math.min(hit.total_pages ?? 1, 500)))
      setError('')
      prefetch(`${API_BASE_URL}/${collection.endpoint(page + 1)}`, API_OPTIONS, TTL.browse)
      return
    }

    setItems([])
    setIsLoading(true)
    setError('')

    cachedFetch(url, API_OPTIONS, TTL.browse)
      .then(data => {
        setItems(data.results || [])
        setTotalPages(Math.max(1, Math.min(data.total_pages ?? 1, 500)))
        prefetch(`${API_BASE_URL}/${collection.endpoint(page + 1)}`, API_OPTIONS, TTL.browse)
      })
      .catch(() => setError('Failed to load collection. Please try again.'))
      .finally(() => setIsLoading(false))
  }, [slug, page]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!collection) {
    return (
      <main>
        <div className="wrapper" style={{ paddingTop: 'calc(72px + 2rem)' }}>
          <p className="error-msg">Collection not found.</p>
        </div>
      </main>
    )
  }

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
              <h1 className="anime-page-title">
                <span style={{ marginRight: 10 }}>{collection.emoji}</span>
                {collection.name}
              </h1>
              {collection.tagline && (
                <p className="anime-page-subtitle">{collection.tagline}</p>
              )}
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
                  : items.map(item => (
                      <Card
                        key={item.id}
                        movie={item}
                        mediaType={collection.type === 'tv' ? 'tv' : 'movie'}
                      />
                    ))
                }
              </ul>
              {!isLoading && !error && items.length === 0 && (
                <div className="browse-empty">
                  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="22" cy="22" r="14"/>
                    <line x1="32" y1="32" x2="43" y2="43"/>
                    <line x1="18" y1="22" x2="26" y2="22"/>
                    <line x1="22" y1="18" x2="22" y2="26"/>
                  </svg>
                  <p>No results found</p>
                  <span>This collection may not have any titles yet</span>
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
