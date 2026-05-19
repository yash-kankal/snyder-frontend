'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { API_BASE_URL, API_OPTIONS } from '../config'
import { cachedFetch, TTL } from '../lib/apiCache'

export default function TopTenRow() {
  const [movies, setMovies] = useState([])

  useEffect(() => {
    cachedFetch(`${API_BASE_URL}/trending/movie/week?page=1`, API_OPTIONS, TTL.browse)
      .then(data => setMovies(data.results?.slice(0, 10) || []))
      .catch(() => {})
  }, [])

  if (!movies.length) return null

  return (
    <section className="top10-section">
      <div className="wrapper">
        <h2 className="top10-heading">Top 10 This Week</h2>
        <div className="top10-scroll">
          {movies.map((movie, i) => (
            <Link key={movie.id} href={`/movie/${movie.id}`} className="top10-card">
              <span className="top10-rank">{i + 1}</span>
              <div className="top10-poster">
                <img
                  src={
                    movie.poster_path
                      ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
                      : '/No-Poster.png'
                  }
                  alt={movie.title}
                  loading="lazy"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
