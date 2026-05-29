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

const TABS = [
  { id: 'known',  label: 'Known For' },
  { id: 'movies', label: 'Movies' },
  { id: 'tv',     label: 'TV Shows' },
]

export default function CompanyPage({ routeId }) {
  const params       = useParams()
  const id           = routeId || params?.id
  const searchParams = useSearchParams()
  const router       = useRouter()

  const tab  = searchParams.get('tab') || 'known'
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))

  const [company, setCompany]       = useState(null)
  const [items, setItems]           = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading]   = useState(true)

  const listRef = useRef(null)
  useRevealOnScroll(listRef, [items, isLoading, tab])

  usePageMeta(
    company ? `${company.name} — Movies & TV Shows` : 'Production Company',
    company ? `Browse every movie and TV show produced by ${company.name} on CuedUp.` : undefined,
  )

  // Company name / logo
  useEffect(() => {
    if (!id) return
    cachedFetch(`${API_BASE_URL}/company/${id}`, API_OPTIONS, TTL.detail)
      .then(setCompany)
      .catch(() => setCompany(null))
  }, [id])

  // Content for this company
  useEffect(() => {
    if (!id) return
    let cancelled = false
    setIsLoading(true)
    setItems([])

    const discover = (type) =>
      cachedFetch(
        `${API_BASE_URL}/discover/${type}?with_companies=${id}&sort_by=popularity.desc&page=${page}`,
        API_OPTIONS, TTL.browse,
      )

    const load = tab === 'known'
      ? Promise.all([discover('movie'), discover('tv')]).then(([m, t]) => {
          const merged = [
            ...(m.results || []).map(r => ({ ...r, media_type: 'movie' })),
            ...(t.results || []).map(r => ({ ...r, media_type: 'tv' })),
          ].sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
          return { results: merged, total_pages: Math.max(m.total_pages || 1, t.total_pages || 1) }
        })
      : discover(tab === 'tv' ? 'tv' : 'movie').then(d => ({
          results: (d.results || []).map(r => ({ ...r, media_type: tab === 'tv' ? 'tv' : 'movie' })),
          total_pages: d.total_pages || 1,
        }))

    load
      .then(data => {
        if (cancelled) return
        setItems(data.results)
        setTotalPages(Math.min(data.total_pages, 500))
      })
      .catch(() => { if (!cancelled) { setItems([]); setTotalPages(1) } })
      .finally(() => { if (!cancelled) setIsLoading(false) })

    return () => { cancelled = true }
  }, [id, tab, page])

  const setTab = useCallback((val) => {
    const next = new URLSearchParams(searchParams.toString())
    val === 'known' ? next.delete('tab') : next.set('tab', val)
    next.delete('page')
    router.replace(`/company/${id}?${next.toString()}`, { scroll: false })
  }, [searchParams, router, id])

  const handlePageChange = useCallback((p) => {
    const next = new URLSearchParams(searchParams.toString())
    p <= 1 ? next.delete('page') : next.set('page', String(p))
    router.replace(`/company/${id}?${next.toString()}`, { scroll: false })
    if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true })
    else window.scrollTo(0, 0)
  }, [searchParams, router, id])

  const logoUrl = company?.logo_path ? `https://image.tmdb.org/t/p/w185${company.logo_path}` : null
  const emptyLabel = tab === 'tv' ? 'TV shows' : tab === 'movies' ? 'movies' : 'titles'

  return (
    <main>
      <div className="wrapper" style={{ paddingTop: 'calc(72px + 2rem)', paddingBottom: '3rem' }}>

        {/* Header */}
        <div className="company-header">
          {logoUrl && (
            <div className="company-logo-wrap">
              <img src={logoUrl} alt={company.name} className="company-logo" />
            </div>
          )}
          <div>
            <p className="company-eyebrow">Production Company</p>
            <h1 className="company-name">{company?.name || 'Loading…'}</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="section-header" style={{ marginTop: 8 }}>
          <div className="browse-tabs">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`browse-tab${tab === t.id ? ' browse-tab--active' : ''}`}
                onClick={() => setTab(t.id)}
              >{t.label}</button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <section className="all-movies" style={{ marginTop: 20 }}>
          <ul ref={listRef}>
            {isLoading
              ? Array.from({ length: 20 }).map((_, i) => <CardSkeleton key={i} />)
              : items.map(item => (
                  <Card key={`${item.media_type}-${item.id}`} movie={item} mediaType={item.media_type} />
                ))
            }
          </ul>
          {!isLoading && items.length === 0 && (
            <p className="error-msg">No {emptyLabel} found for this company.</p>
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
