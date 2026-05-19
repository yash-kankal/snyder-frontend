'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Card from '../components/Card'
import CardSkeleton from '../components/CardSkeleton'
import Pagination from '../components/Pagination'
import { API_BASE_URL, API_OPTIONS } from '../config'
import { cachedFetch, TTL } from '../lib/apiCache'
import { usePageMeta } from '../lib/usePageMeta'
import Footer from '../components/Footer'

const PROVIDERS = [
  { id: '8',    name: 'Netflix',     badge: 'N',  region: 'IN', color: '#E50914' },
  { id: '119',  name: 'Prime',       badge: 'Pr', region: 'IN', color: '#00A8E1', localLogo: '/amazon-prime-video.svg' },
  { id: '350',  name: 'Apple TV+',   badge: 'TV', region: 'IN', color: '#555560' },
  { id: '2336', name: 'JioHotstar',  badge: 'JH', region: 'IN', color: '#1C59CF', localLogo: '/jio.svg' },
  { id: '337',  name: 'Disney+',     badge: 'D+', region: 'US', color: '#113CCF' },
  { id: '15',   name: 'Hulu',        badge: 'H',  region: 'US', color: '#1CE783' },
  { id: '283',  name: 'Crunchyroll', badge: 'CR', region: 'IN', color: '#F47521' },
]

const TABS = [
  { id: 'popular',  label: 'Popular' },
  { id: 'new',      label: 'New Releases' },
  { id: 'toprated', label: 'Top Rated' },
]

function getEndpoint(providerId, region, tab, mediaType, page) {
  const base = `with_watch_providers=${providerId}&watch_region=${region}&with_watch_monetization_types=flatrate&page=${page}`

  if (tab === 'popular') {
    return `${API_BASE_URL}/discover/${mediaType}?${base}&sort_by=popularity.desc`
  }
  if (tab === 'new') {
    const cutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const dateKey = mediaType === 'tv' ? 'first_air_date' : 'primary_release_date'
    return `${API_BASE_URL}/discover/${mediaType}?${base}&sort_by=${dateKey}.desc&${dateKey}.gte=${cutoff}`
  }
  if (tab === 'toprated') {
    return `${API_BASE_URL}/discover/${mediaType}?${base}&sort_by=vote_average.desc&vote_count.gte=200`
  }
  return `${API_BASE_URL}/discover/${mediaType}?${base}&sort_by=popularity.desc`
}

export default function StreamingPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const providerId = searchParams.get('provider') || '8'
  const tab        = searchParams.get('tab')      || 'popular'
  const mediaType  = searchParams.get('type')     || 'movie'
  const page       = Math.max(1, parseInt(searchParams.get('page') || '1', 10))

  const [items, setItems]           = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading]   = useState(true)
  const [logos, setLogos]           = useState({})   // { providerId: logo_path }

  const provider = PROVIDERS.find(p => p.id === providerId) || PROVIDERS[0]

  usePageMeta(`${provider.name} — Streaming Hub`)

  // Fetch provider logos once — pull from both US and IN so region-specific
  // platforms (JioHotstar, SonyLIV, etc.) also get their logos
  useEffect(() => {
    const fetchLogos = async () => {
      try {
        const [moviesUS, tvUS, moviesIN, tvIN] = await Promise.all([
          cachedFetch(`${API_BASE_URL}/watch/providers/movie?watch_region=US`, API_OPTIONS, TTL.detail),
          cachedFetch(`${API_BASE_URL}/watch/providers/tv?watch_region=US`,    API_OPTIONS, TTL.detail),
          cachedFetch(`${API_BASE_URL}/watch/providers/movie?watch_region=IN`, API_OPTIONS, TTL.detail),
          cachedFetch(`${API_BASE_URL}/watch/providers/tv?watch_region=IN`,    API_OPTIONS, TTL.detail),
        ])
        const map = {}
        ;[
          ...(moviesUS.results || []),
          ...(tvUS.results     || []),
          ...(moviesIN.results || []),
          ...(tvIN.results     || []),
        ].forEach(p => {
          if (!map[p.provider_id]) map[p.provider_id] = p.logo_path
        })
        setLogos(map)
      } catch {}
    }
    fetchLogos()
  }, [])

  // Fetch content
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setItems([])

    const url = getEndpoint(providerId, provider.region, tab, mediaType, page)
    cachedFetch(url, API_OPTIONS, TTL.browse)
      .then(data => {
        if (cancelled) return
        const results = (data.results || []).map(r => ({ ...r, media_type: mediaType }))
        setItems(results)
        setTotalPages(Math.min(data.total_pages || 1, 500))
      })
      .catch(() => { if (!cancelled) { setItems([]); setTotalPages(1) } })
      .finally(() => { if (!cancelled) setIsLoading(false) })

    return () => { cancelled = true }
  }, [providerId, tab, mediaType, page, provider.region])

  const setParam = useCallback((key, val, isDefault) => {
    const params = new URLSearchParams(searchParams.toString())
    isDefault ? params.delete(key) : params.set(key, val)
    params.delete('page')
    router.replace(`/streaming?${params.toString()}`, { scroll: false })
  }, [searchParams, router])

  const handlePageChange = useCallback(p => {
    const params = new URLSearchParams(searchParams.toString())
    p <= 1 ? params.delete('page') : params.set('page', String(p))
    router.replace(`/streaming?${params.toString()}`, { scroll: false })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [searchParams, router])

  const logoUrl = logos[parseInt(providerId)]
    ? `https://image.tmdb.org/t/p/w92${logos[parseInt(providerId)]}`
    : null

  return (
    <main className="streaming-page" style={{ '--p-color': provider.color }}>
      <div className="pattern" />
      <div className="wrapper streaming-wrapper">

        {/* ── Provider selector ── */}
        <p className="streaming-providers-label">Select a streaming platform ›</p>
        <div className="streaming-providers">
          {PROVIDERS.map(p => {
            const logo = logos[parseInt(p.id)]
            const isActive = p.id === providerId
            return (
              <button
                key={p.id}
                className={`streaming-provider-btn${isActive ? ' streaming-provider-btn--active' : ''}`}
                style={isActive ? { '--p-color': p.color, borderColor: p.color + 'BB', background: p.color + '40' } : {}}
                onClick={() => setParam('provider', p.id, p.id === '8')}
              >
                {logo
                  ? <img src={`https://image.tmdb.org/t/p/w45${logo}`} alt={p.name} className="streaming-provider-logo" />
                  : p.localLogo
                    ? <img src={p.localLogo} alt={p.name} className="streaming-provider-logo" />
                    : <span className="streaming-provider-icon" style={{ background: p.color }}>{p.badge}</span>
                }
                <span className="streaming-provider-label">{p.name}</span>
              </button>
            )
          })}
        </div>

        {/* ── Controls ── */}
        <div className="streaming-controls">
          {/* Row 1: OTT icon + name */}
          <div className="streaming-hero-left">
            {logoUrl
              ? <img src={logoUrl} alt={provider.name} className="streaming-hero-logo" />
              : provider.localLogo
                ? <img src={provider.localLogo} alt={provider.name} className="streaming-hero-logo streaming-hero-logo--local" />
                : <span className="streaming-hero-icon" style={{ background: provider.color }}>{provider.badge}</span>
            }
            <span className="streaming-hero-name">{provider.name}</span>
          </div>

          {/* Row 2: tabs (left)  +  Movies / TV Shows (right) */}
          <div className="streaming-controls-row2">
            <div className="browse-tabs streaming-tabs">
              {TABS.map(t => (
                <button
                  key={t.id}
                  className={`browse-tab${tab === t.id || (!searchParams.get('tab') && t.id === 'popular') ? ' browse-tab--active' : ''}`}
                  onClick={() => setParam('tab', t.id, t.id === 'popular')}
                >{t.label}</button>
              ))}
            </div>
            <div className="streaming-type-toggle">
              {[['movie', 'Movies'], ['tv', 'TV Shows']].map(([val, label]) => (
                <button
                  key={val}
                  className={`streaming-type-btn${mediaType === val ? ' streaming-type-btn--active' : ''}`}
                  onClick={() => setParam('type', val, val === 'movie')}
                >{label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Grid ── */}
        <section className="all-movies streaming-grid">
          <ul>
            {isLoading
              ? Array.from({ length: 20 }).map((_, i) => <CardSkeleton key={i} />)
              : items.map(item => <Card key={item.id} movie={item} mediaType={mediaType} />)
            }
          </ul>
          {!isLoading && items.length === 0 && (
            <p className="error-msg">No results found for this filter.</p>
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
