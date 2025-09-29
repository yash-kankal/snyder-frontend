import { useEffect, useState } from 'react'
import './App.css'
import Search from './components/Search'
import Spinner from './components/Spinner';
import Card from './components/Card';
import Pagination from './components/Pagination';
import { useDebounce } from "react-use"

const API_BASE_URL = "https://api.themoviedb.org/3";
const API_KEY = import.meta.env.VITE_TMDB_API_TOKEN;

const API_OPTIONS = {
  method: "GET",
  headers: {
    accept: "application/json",
    Authorization: "Bearer " + API_KEY
  }
}

function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [movieList, setMovieList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  useDebounce(() => {
    setDebouncedSearchTerm(searchTerm);
  }, 500, [searchTerm]);

  const fetchMovies = async (query = "", pageNum = 1) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const base =
        query && query.trim().length > 0
          ? `${API_BASE_URL}/search/movie?query=${encodeURIComponent(query)}`
          : `${API_BASE_URL}/discover/movie?sort_by=popularity.desc`;

      const endpoint = `${base}&page=${pageNum}`;

      const response = await fetch(endpoint, API_OPTIONS);
      if (!response.ok) {
        throw new Error("Failed to fetch movies");
      }

      const data = await response.json();

      // TMDB style payload
      // { page, results, total_pages, total_results }
      if (!data || !Array.isArray(data.results)) {
        setErrorMessage("No results found.");
        setMovieList([]);
        setTotalPages(1);
        setTotalResults(0);
        return;
      }

      setMovieList(data.results || []);
      // TMDB limits total_pages to 500 for most endpoints
      setTotalPages(Math.max(1, Math.min(data.total_pages || 1, 500)));
      setTotalResults(data.total_results || 0);
    } catch (error) {
      console.error(`Error fetching movies: ${error}`);
      setErrorMessage("Error fetching movies. Please try again later.");
      setMovieList([]);
      setTotalPages(1);
      setTotalResults(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset to page 1 whenever the search term changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm]);

  // Fetch when page or debounced search term changes
  useEffect(() => {
    fetchMovies(debouncedSearchTerm, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm, page]);

  return (
    <main>
      <div className='pattern' />
      <div className='wrapper'>
        <header className='mt-[5px]'>
          <h1><span className='text-white'>Snyder.</span></h1>
          <img src='/hero-img (2).png' alt="Hero" />
          <h1 className='text-gradient'>Find Movies You'll Enjoy Without the Hassle</h1>
          <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        </header>

        <section className='all-movies'>
          <div className='flex items-center justify-between mt-[50px] gap-4 flex-wrap'>
            <h2>All Movies</h2>
            <div className='text-sm opacity-80'>
              {totalResults > 0 && (
                <span>
                  Page {page} of {totalPages} • {totalResults.toLocaleString()} results
                </span>
              )}
            </div>
          </div>

          {isLoading ? (
            <Spinner />
          ) : errorMessage ? (
            <p className='text-red-500'>{errorMessage}</p>
          ) : (
            <>
              <ul>
                {movieList.map((movie) => (
                  <Card key={movie.id} movie={movie} />
                ))}
              </ul>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className='mt-6'>
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={(p) => {
                      if (p >= 1 && p <= totalPages) setPage(p);
                    }}
                  />
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

export default App;
