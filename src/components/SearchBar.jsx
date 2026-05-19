'use client'
import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDebounce } from 'react-use'
import { API_BASE_URL, API_OPTIONS } from '../config'
import { cachedFetch, TTL } from '../lib/apiCache'

const SearchBar = forwardRef(function SearchBar({ autoFocus = false }, ref) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [movies, setMovies]   = useState([])
  const [tvShows, setTvShows] = useState([])
  const [people, setPeople]   = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)

  const containerRef = useRef(null)
  const inputRef = useRef(null)

  // Expose focus() to parent components (e.g. mobile search overlay)
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus()
  }))

  useEffect(() => {
    setQuery(searchParams.get('q') || '')
    setShowDropdown(false)
  }, [searchParams])

  useDebounce(() => setDebouncedQuery(query), 300, [query])

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setMovies([]); setTvShows([]); setPeople([])
      setShowDropdown(false)
      return
    }
    const fetchSuggestions = async () => {
      setLoading(true)
      try {
        const url = `${API_BASE_URL}/search/multi?query=${encodeURIComponent(debouncedQuery)}&page=1`
        const data = await cachedFetch(url, API_OPTIONS, TTL.suggestions)
        const results = data.results || []
        setMovies(results.filter(r => r.media_type === 'movie').slice(0, 4))
        setTvShows(results.filter(r => r.media_type === 'tv').slice(0, 3))
        setPeople(results.filter(r => r.media_type === 'person').slice(0, 4))
        setShowDropdown(true)
      } catch {
        setMovies([]); setTvShows([]); setPeople([])
      } finally {
        setLoading(false)
      }
    }
    fetchSuggestions()
  }, [debouncedQuery])

  // Use 'click' instead of 'mousedown' so touch-tapping a result registers
  // before the outside-click handler fires (mousedown fires before click on touch)
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target))
        setShowDropdown(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const goToSearch = (q) => {
    setShowDropdown(false)
    router.push(`/browse?q=${encodeURIComponent(q.trim())}`)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { setShowDropdown(false); inputRef.current?.blur() }
    if (e.key === 'Enter' && query.trim()) goToSearch(query)
  }

  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    if (!val.trim()) setShowDropdown(false)
  }

  const hasResults = movies.length > 0 || tvShows.length > 0 || people.length > 0

  return (
    <div ref={containerRef} className="search-bar-wrap">
      <div className="search-bar-input">
        <img src="/Vector.svg" alt="" className="search-bar-icon" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => hasResults && query.trim() && setShowDropdown(true)}
          placeholder="Search movies, shows, people..."
          autoComplete="off"
          autoFocus={autoFocus}
        />
        {query && (
          <button
            className="search-bar-clear"
            onClick={() => { setQuery(''); setMovies([]); setTvShows([]); setPeople([]); setShowDropdown(false) }}
            aria-label="Clear"
          >×</button>
        )}
      </div>

      {showDropdown && (
        <div className="search-dropdown">
          {loading ? (
            <p className="search-dropdown-status">Searching…</p>
          ) : hasResults ? (
            <>
              {/* Movies */}
              {movies.length > 0 && (
                <div className="search-dropdown-section">
                  <p className="search-dropdown-section-label">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="search-section-icon">
                      <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 100-4V6z"/>
                    </svg>
                    Movies
                  </p>
                  {movies.map(m => (
                    <button key={m.id} className="search-dropdown-item"
                      onClick={() => { setShowDropdown(false); router.push(`/movie/${m.id}`) }}>
                      <img
                        src={m.poster_path ? `https://image.tmdb.org/t/p/w92/${m.poster_path}` : '/No-Poster.png'}
                        alt={m.title}
                      />
                      <div className="search-dropdown-item-info">
                        <p className="search-dropdown-title">{m.title}</p>
                        <p className="search-dropdown-meta">
                          {m.release_date?.split('-')[0] || '—'}{' · ★ '}{m.vote_average?.toFixed(1) || 'N/A'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* TV Shows */}
              {tvShows.length > 0 && (
                <div className="search-dropdown-section">
                  <p className="search-dropdown-section-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-section-icon">
                      <rect x="2" y="7" width="20" height="14" rx="2"/><polyline points="17 2 12 7 7 2"/>
                    </svg>
                    TV Shows
                  </p>
                  {tvShows.map(t => (
                    <button key={t.id} className="search-dropdown-item"
                      onClick={() => { setShowDropdown(false); router.push(`/tv/${t.id}`) }}>
                      <img
                        src={t.poster_path ? `https://image.tmdb.org/t/p/w92/${t.poster_path}` : '/No-Poster.png'}
                        alt={t.name}
                      />
                      <div className="search-dropdown-item-info">
                        <p className="search-dropdown-title">{t.name}</p>
                        <p className="search-dropdown-meta">
                          {t.first_air_date?.split('-')[0] || '—'}{' · ★ '}{t.vote_average?.toFixed(1) || 'N/A'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* People */}
              {people.length > 0 && (
                <div className="search-dropdown-section search-dropdown-section--people">
                  <p className="search-dropdown-section-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-section-icon">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    People
                  </p>
                  <div className="search-people-row">
                    {people.map(p => (
                      <button key={p.id} className="search-person-item"
                        onClick={() => { setShowDropdown(false); router.push(`/person/${p.id}`) }}>
                        <div className="search-person-avatar">
                          <img
                            src={p.profile_path ? `https://image.tmdb.org/t/p/w185/${p.profile_path}` : '/No-Poster.png'}
                            alt={p.name}
                          />
                        </div>
                        <p className="search-person-name">{p.name}</p>
                        <p className="search-person-dept">{p.known_for_department || 'Actor'}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button className="search-dropdown-see-all" onClick={() => goToSearch(query)}>
                See all results for &ldquo;{query}&rdquo; →
              </button>
            </>
          ) : (
            <p className="search-dropdown-status">No results found</p>
          )}
        </div>
      )}
    </div>
  )
})

export default SearchBar
