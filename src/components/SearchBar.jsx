import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDebounce } from 'react-use'
import { API_BASE_URL, API_OPTIONS } from '../config'

export default function SearchBar() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [results, setResults] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)

  const containerRef = useRef(null)
  const inputRef = useRef(null)

  // Sync input value when URL q param changes (e.g. navigating back)
  useEffect(() => {
    setQuery(searchParams.get('q') || '')
    setShowDropdown(false)
  }, [searchParams])

  useDebounce(() => setDebouncedQuery(query), 300, [query])

  // Fetch dropdown suggestions
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([])
      setShowDropdown(false)
      return
    }
    const fetchSuggestions = async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `${API_BASE_URL}/search/movie?query=${encodeURIComponent(debouncedQuery)}&page=1`,
          API_OPTIONS
        )
        const data = await res.json()
        setResults(data.results?.slice(0, 6) || [])
        setShowDropdown(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }
    fetchSuggestions()
  }, [debouncedQuery])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const goToSearch = (q) => {
    setShowDropdown(false)
    navigate(`/?q=${encodeURIComponent(q.trim())}`)
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

  const handleClear = () => {
    setQuery('')
    setResults([])
    setShowDropdown(false)
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} className="search-bar-wrap">
      {/* Input */}
      <div className="search-bar-input">
        <img src="/Vector.svg" alt="" className="search-bar-icon" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && query.trim() && setShowDropdown(true)}
          placeholder="Search movies..."
          autoComplete="off"
        />
        {query && (
          <button className="search-bar-clear" onClick={handleClear} aria-label="Clear">
            ×
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="search-dropdown">
          {loading ? (
            <p className="search-dropdown-status">Searching…</p>
          ) : results.length > 0 ? (
            <>
              {results.map((movie) => (
                <button
                  key={movie.id}
                  className="search-dropdown-item"
                  onClick={() => { setShowDropdown(false); navigate(`/movie/${movie.id}`) }}
                >
                  <img
                    src={
                      movie.poster_path
                        ? `https://image.tmdb.org/t/p/w92/${movie.poster_path}`
                        : '/No-Poster.png'
                    }
                    alt={movie.title}
                  />
                  <div className="search-dropdown-item-info">
                    <p className="search-dropdown-title">{movie.title}</p>
                    <p className="search-dropdown-meta">
                      {movie.release_date?.split('-')[0] || '—'}
                      {' · '}
                      <img src="/star.svg" alt="" style={{ display: 'inline', width: 10, height: 10, marginBottom: 1 }} />
                      {' '}
                      {movie.vote_average?.toFixed(1) || 'N/A'}
                    </p>
                  </div>
                </button>
              ))}
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
}
