import { useEffect, useState } from 'react'
import { Routes, Route, useSearchParams } from 'react-router-dom'
import './App.css'
import Navbar from './components/Navbar'
import Spinner from './components/Spinner'
import Card from './components/Card'
import Pagination from './components/Pagination'
import MovieDetails from './pages/MovieDetails'
import { API_BASE_URL, API_OPTIONS } from './config'

function getEndpoint(section, query, pageNum) {
  if (query?.trim()) {
    return `${API_BASE_URL}/search/movie?query=${encodeURIComponent(query)}&page=${pageNum}`
  }
  if (section === 'trending') return `${API_BASE_URL}/trending/movie/week?page=${pageNum}`
  if (section === 'new') return `${API_BASE_URL}/movie/now_playing?page=${pageNum}`
  return `${API_BASE_URL}/discover/movie?sort_by=popularity.desc&page=${pageNum}`
}

function getSectionTitle(section, query) {
  if (query) return `Results for "${query}"`
  if (section === 'trending') return 'Trending This Week'
  if (section === 'new') return 'Now Playing'
  return 'Popular Movies'
}

function Home() {
  const [searchParams] = useSearchParams()
  const section = searchParams.get('section') || 'popular'
  const urlQuery = searchParams.get('q') || ''

  const [movieList, setMovieList] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalResults, setTotalResults] = useState(0)

  const fetchMovies = async (sec, query, pageNum) => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const res = await fetch(getEndpoint(sec, query, pageNum), API_OPTIONS)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      if (!data || !Array.isArray(data.results)) {
        setErrorMessage('No results found.')
        setMovieList([])
        setTotalPages(1)
        setTotalResults(0)
        return
      }
      setMovieList(data.results)
      setTotalPages(Math.max(1, Math.min(data.total_pages || 1, 500)))
      setTotalResults(data.total_results || 0)
    } catch (err) {
      console.error(err)
      setErrorMessage('Error fetching movies. Please try again later.')
      setMovieList([])
      setTotalPages(1)
      setTotalResults(0)
    } finally {
      setIsLoading(false)
    }
  }

  // Reset to page 1 when filter/query changes
  useEffect(() => { setPage(1) }, [section, urlQuery])

  useEffect(() => {
    window.scrollTo({ top: 0 })
    fetchMovies(section, urlQuery, page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, urlQuery, page])

  return (
    <main>
      <div className="pattern" />
      <div className="wrapper">
        <section className="all-movies">
          <div className="section-header">
            <h2>{getSectionTitle(section, urlQuery)}</h2>
            {totalResults > 0 && (
              <span className="results-count">
                {totalResults.toLocaleString()} results · pg {page}/{totalPages}
              </span>
            )}
          </div>

          {isLoading ? (
            <Spinner />
          ) : errorMessage ? (
            <p className="error-msg">{errorMessage}</p>
          ) : (
            <>
              <ul>
                {movieList.map((movie) => (
                  <Card key={movie.id} movie={movie} />
                ))}
              </ul>
              {totalPages > 1 && (
                <div className="mt-10">
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={(p) => { if (p >= 1 && p <= totalPages) setPage(p) }}
                  />
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  )
}

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/movie/:id" element={<MovieDetails />} />
      </Routes>
    </>
  )
}

export default App
