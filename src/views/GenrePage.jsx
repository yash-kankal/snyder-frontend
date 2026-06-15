'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Card from '../components/Card'
import CardSkeleton from '../components/CardSkeleton'
import Pagination from '../components/Pagination'
import Footer from '../components/Footer'
import { API_BASE_URL, API_OPTIONS } from '../config'
import { cachedFetch, TTL } from '../lib/apiCache'
import { usePageMeta } from '../lib/usePageMeta'
import { useRevealOnScroll } from '../lib/useRevealOnScroll'
import { findGenreBySlug } from '../data/genres'

export default function GenrePage({ routeSlug }) {
  const params       = useParams()
  const slug         = routeSlug || params?.slug
  const searchParams = useSearchParams()
  const router       = useRouter()

  const genre = findGenreBySlug(slug)

  // Available media tabs depend on which IDs the genre has.
  const tabs = []
  if (genre?.movieId) tabs.push({ id: 'movie', label: 'Movies' })
  if (genre?.tvId)    tabs.push({ id: 'tv',    label: 'TV Shows' })

  const requested = searchParams.get('type')
  const mediaType = tabs.some(t => t.id === requested) ? requested : (tabs[0]?.id || 'movie')
  const page      = Math.max(1, parseInt(searchParams.get('page') || '1', 10))

  const [items, setItems]           = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading]   = useState(true)

  const listRef = useRef(null)
  useRevealOnScroll(listRef, [items, isLoading, mediaType])

  usePageMeta(
    genre ? `${genre.name} Movies & TV Shows` : 'Genre',
    genre ? genre.blurb : undefined,
  )

  useEffect(() => {
    if (!genre) { setIsLoading(false); return }
    const genreId = mediaType === 'tv' ? genre.tvId : genre.movieId
    if (!genreId) { setItems([]); setIsLoading(false); return }
    let cancelled = false
    setIsLoading(true)
    setItems([])
    cachedFetch(
      `${API_BASE_URL}/discover/${mediaType}?with_genres=${genreId}&sort_by=popularity.desc&vote_count.gte=50&page=${page}`,
      API_OPTIONS, TTL.browse,
    )
      .then(data => {
        if (cancelled) return
        setItems((data.results || []).filter(r => r.poster_path).map(r => ({ ...r, media_type: mediaType })))
        setTotalPages(Math.min(data.total_pages || 1, 500))
      })
      .catch(() => { if (!cancelled) { setItems([]); setTotalPages(1) } })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [slug, mediaType, page, genre])

  const setType = useCallback((val) => {
    const next = new URLSearchParams(searchParams.toString())
    val === tabs[0]?.id ? next.delete('type') : next.set('type', val)
    next.delete('page')
    router.replace(`/genre/${slug}?${next.toString()}`, { scroll: false })
  }, [searchParams, router, slug, tabs])

  const handlePageChange = useCallback((p) => {
    const next = new URLSearchParams(searchParams.toString())
    p <= 1 ? next.delete('page') : next.set('page', String(p))
    router.replace(`/genre/${slug}?${next.toString()}`, { scroll: false })
    if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true })
    else window.scrollTo(0, 0)
  }, [searchParams, router, slug])

  if (!genre) {
    return (
      <main>
        <div className="wrapper" style={{ paddingTop: 'calc(72px + 2rem)' }}>
          <p className="error-msg">Genre not found.</p>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main>
      <div className="wrapper" style={{ paddingTop: 'calc(72px + 2rem)', paddingBottom: '3rem' }}>

        <div className="genre-header">
          <p className="company-eyebrow">Genre</p>
          <h1 className="company-name">{genre.name}</h1>
          <p className="genre-blurb">{genre.blurb}</p>
        </div>

        {tabs.length > 1 && (
          <div className="section-header" style={{ marginTop: 8 }}>
            <div className="browse-tabs">
              {tabs.map(t => (
                <button
                  key={t.id}
                  className={`browse-tab${mediaType === t.id ? ' browse-tab--active' : ''}`}
                  onClick={() => setType(t.id)}
                >{t.label}</button>
              ))}
            </div>
          </div>
        )}

        <section className="all-movies" style={{ marginTop: 20 }}>
          <ul ref={listRef} key={mediaType} className="tab-content-swap">
            {isLoading
              ? Array.from({ length: 20 }).map((_, i) => <CardSkeleton key={i} />)
              : items.map(item => <Card key={item.id} movie={item} mediaType={mediaType} />)
            }
          </ul>
          {!isLoading && items.length === 0 && (
            <p className="error-msg">Nothing found in this genre.</p>
          )}
          {!isLoading && totalPages > 1 && (
            <div className="mt-10">
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          )}
        </section>

      </div>
      <Footer />
    </main>
  )
}
