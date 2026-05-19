'use client'
import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Spinner from '../components/Spinner'
import Card from '../components/Card'
import { API_BASE_URL, API_OPTIONS } from '../config'
import { cachedFetch, TTL } from '../lib/apiCache'
import { usePageMeta } from '../lib/usePageMeta'
import JsonLd from '../lib/JsonLd'

const FILMOGRAPHY_TABS = ['Known For', 'Films', 'TV Shows', 'Directed']

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

function formatBirthday(dateStr) {
  if (!dateStr) return null
  const [year, month, day] = dateStr.split('-').map(Number)
  return `${day} ${MONTHS[month - 1]}, ${year}`
}

export default function PersonPage({ routeId } = {}) {
  const { id: paramId } = useParams() || {}
  const id = routeId || paramId
  const [person, setPerson] = useState(null)

  usePageMeta(
    person?.name,
    person?.biography ? person.biography.slice(0, 160) : undefined,
    person?.profile_path ? `https://image.tmdb.org/t/p/w342${person.profile_path}` : undefined
  )
  const [movies, setMovies] = useState([])
  const [filmMovies, setFilmMovies] = useState([])
  const [filmTV, setFilmTV] = useState([])
  const [filmDirected, setFilmDirected] = useState([])
  const [activeTab, setActiveTab] = useState('Known For')
  const [sortOrder, setSortOrder] = useState('desc')   // 'desc' = newest first, 'asc' = oldest first
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [photoLoaded, setPhotoLoaded] = useState(false)

  // Lock page scroll on desktop only
  useEffect(() => {
    if (window.innerWidth < 768) return
    const html = document.documentElement
    const body = document.body
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = ''
      body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
    let cancelled = false
    const fetchPerson = async () => {
      setIsLoading(true)
      setError('')
      try {
        // Fetch both movie + TV credits in one request
        const data = await cachedFetch(
          `${API_BASE_URL}/person/${id}?append_to_response=combined_credits`,
          API_OPTIONS, TTL.detail
        )
        if (cancelled) return
        setPerson(data)

        const cast = (data.combined_credits?.cast || []).map(item => ({
          ...item,
          mediaType: item.media_type || (item.title ? 'movie' : 'tv'),
        }))
        const crew = (data.combined_credits?.crew || []).map(item => ({
          ...item,
          mediaType: item.media_type || (item.title ? 'movie' : 'tv'),
        }))

        // Deduplicate crew by id, keeping highest vote_count
        const crewById = {}
        for (const c of crew) {
          const key = `${c.mediaType}-${c.id}`
          if (!crewById[key] || (c.vote_count || 0) > (crewById[key].vote_count || 0)) {
            crewById[key] = c
          }
        }

        // Cast takes priority; add crew entries not already in cast
        const castKeys = new Set(cast.map(m => `${m.mediaType}-${m.id}`))
        const combined = [
          ...cast,
          ...Object.values(crewById).filter(m => !castKeys.has(`${m.mediaType}-${m.id}`)),
        ]

        // Known For: top 24, sorted by release date descending (newest first)
        const sorted = combined
          .filter(m => m.poster_path)
          .sort((a, b) => {
            const da = a.release_date || a.first_air_date || ''
            const db = b.release_date || b.first_air_date || ''
            return db.localeCompare(da)
          })
          .slice(0, 24)
        setMovies(sorted)

        // Films: ALL movie cast credits + movie crew (Director), deduplicated by id, sorted by release_date desc
        const movieCastRaw = cast.filter(m => m.media_type === 'movie')
        const movieDirectorCrew = (data.combined_credits?.crew || [])
          .filter(m => (m.media_type === 'movie') && m.job === 'Director')
          .map(item => ({ ...item, mediaType: 'movie' }))
        const movieById = {}
        for (const m of [...movieCastRaw, ...movieDirectorCrew]) {
          const key = m.id
          if (!movieById[key] || (m.vote_count || 0) > (movieById[key].vote_count || 0)) {
            movieById[key] = { ...m, mediaType: 'movie' }
          }
        }
        const allMovies = Object.values(movieById).sort((a, b) => {
          const da = a.release_date || ''
          const db = b.release_date || ''
          return db.localeCompare(da)
        })
        setFilmMovies(allMovies)

        // TV Shows: ALL tv cast credits, sorted by first_air_date desc
        const tvCast = cast
          .filter(m => m.media_type === 'tv')
          .map(m => ({ ...m, mediaType: 'tv' }))
        // Deduplicate by id
        const tvById = {}
        for (const m of tvCast) {
          if (!tvById[m.id] || (m.vote_count || 0) > (tvById[m.id].vote_count || 0)) {
            tvById[m.id] = m
          }
        }
        const allTV = Object.values(tvById).sort((a, b) => {
          const da = a.first_air_date || ''
          const db = b.first_air_date || ''
          return db.localeCompare(da)
        })
        setFilmTV(allTV)

        // Directed: all crew entries where job === 'Director', both movies and TV
        const directedRaw = (data.combined_credits?.crew || [])
          .filter(m => m.job === 'Director')
          .map(item => ({
            ...item,
            mediaType: item.media_type || (item.title ? 'movie' : 'tv'),
          }))
        // Deduplicate by id+mediaType
        const directedById = {}
        for (const m of directedRaw) {
          const key = `${m.mediaType}-${m.id}`
          if (!directedById[key]) directedById[key] = m
        }
        const allDirected = Object.values(directedById).sort((a, b) => {
          const da = a.release_date || a.first_air_date || ''
          const db = b.release_date || b.first_air_date || ''
          return db.localeCompare(da)
        })
        setFilmDirected(allDirected)
      } catch {
        if (!cancelled) setError('Could not load actor details.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    fetchPerson()
    return () => { cancelled = true }
  }, [id])

  const sortFn = (dateKeys) => (a, b) => {
    const da = dateKeys.map(k => a[k] || '').find(v => v) || ''
    const db = dateKeys.map(k => b[k] || '').find(v => v) || ''
    return sortOrder === 'desc' ? db.localeCompare(da) : da.localeCompare(db)
  }
  const sortedKnownFor  = useMemo(() => [...movies].sort(sortFn(['release_date', 'first_air_date'])),     [movies, sortOrder])      // eslint-disable-line
  const sortedFilms     = useMemo(() => [...filmMovies].sort(sortFn(['release_date'])),                   [filmMovies, sortOrder])   // eslint-disable-line
  const sortedTV        = useMemo(() => [...filmTV].sort(sortFn(['first_air_date'])),                     [filmTV, sortOrder])       // eslint-disable-line
  const sortedDirected  = useMemo(() => [...filmDirected].sort(sortFn(['release_date', 'first_air_date'])), [filmDirected, sortOrder]) // eslint-disable-line

  if (isLoading) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <Spinner />
      </main>
    )
  }

  if (error || !person) {
    return (
      <main>
        <div className="wrapper">
          <p className="error-msg mt-10">{error || 'Person not found.'}</p>
        </div>
      </main>
    )
  }

  const birthday = formatBirthday(person.birthday)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    description: person.biography || undefined,
    image: person.profile_path ? `https://image.tmdb.org/t/p/w342${person.profile_path}` : undefined,
    birthDate: person.birthday || undefined,
    birthPlace: person.place_of_birth || undefined,
    jobTitle: person.known_for_department || undefined,
    url: `https://cuedup.online/person/${person.id}`,
  }

  return (
    <main className="person-page-main">
      <JsonLd data={jsonLd} />
      <div className="wrapper" style={{ paddingTop: 'calc(72px + 1.5rem)' }}>
        <div className="person-layout">

          {/* ── Mobile-only profile header ── */}
          <div className="mob-person-header">
            <div className="mob-person-photo-wrap">
              {!photoLoaded && <div className="mob-person-photo-skeleton" />}
              <img
                src={person.profile_path ? `https://image.tmdb.org/t/p/w342/${person.profile_path}` : '/No-Poster.png'}
                alt={person.name}
                className="mob-person-photo"
                onLoad={() => setPhotoLoaded(true)}
                style={{ opacity: photoLoaded ? 1 : 0 }}
              />
            </div>
            <h1 className="mob-person-name">{person.name}</h1>
            {person.known_for_department && (
              <span className="mob-person-dept">{person.known_for_department}</span>
            )}
            <div className="mob-person-stats">
              {birthday && (
                <div className="mob-person-stat">
                  <span className="mob-person-stat-label">Born</span>
                  <span className="mob-person-stat-value">{birthday}</span>
                </div>
              )}
              {person.place_of_birth && (
                <div className="mob-person-stat">
                  <span className="mob-person-stat-label">From</span>
                  <span className="mob-person-stat-value">{person.place_of_birth}</span>
                </div>
              )}
              {person.gender != null && person.gender !== 0 && (
                <div className="mob-person-stat">
                  <span className="mob-person-stat-label">Gender</span>
                  <span className="mob-person-stat-value">{person.gender === 1 ? 'Female' : person.gender === 2 ? 'Male' : 'Non-binary'}</span>
                </div>
              )}
              {person.popularity != null && (
                <div className="mob-person-stat">
                  <span className="mob-person-stat-label">Popularity</span>
                  <span className="mob-person-stat-value">{person.popularity.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Left column: photo + meta box */}
          <div className="person-photo-col">
            <div className="person-photo">
              {!photoLoaded && <div className="person-photo-skeleton" />}
              <img
                src={
                  person.profile_path
                    ? `https://image.tmdb.org/t/p/w342/${person.profile_path}`
                    : '/No-Poster.png'
                }
                alt={person.name}
                onLoad={() => setPhotoLoaded(true)}
                style={{ opacity: photoLoaded ? 1 : 0 }}
              />
            </div>

            {/* Meta info box under the photo */}
            <div className="person-meta-card detail-card">
              {person.known_for_department && (
                <div className="person-meta-row">
                  <span className="person-meta-label">Department</span>
                  <span className="person-meta-value">{person.known_for_department}</span>
                </div>
              )}
              {birthday && (
                <div className="person-meta-row">
                  <span className="person-meta-label">Born</span>
                  <span className="person-meta-value">{birthday}</span>
                </div>
              )}
              {person.place_of_birth && (
                <div className="person-meta-row">
                  <span className="person-meta-label">From</span>
                  <span className="person-meta-value">{person.place_of_birth}</span>
                </div>
              )}
              {person.popularity != null && (
                <div className="person-meta-row">
                  <span className="person-meta-label">Popularity</span>
                  <span className="person-meta-value">{person.popularity.toFixed(1)}</span>
                </div>
              )}
              {person.gender != null && person.gender !== 0 && (
                <div className="person-meta-row">
                  <span className="person-meta-label">Gender</span>
                  <span className="person-meta-value">
                    {person.gender === 1 ? 'Female' : person.gender === 2 ? 'Male' : 'Non-binary'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right column: name pinned, inner content scrolls */}
          <div className="person-info-card detail-card">
            <h1 className="detail-title">{person.name}</h1>

            {/* Only this inner div scrolls */}
            <div className="person-info-scroll">
              {person.biography && (
                <p className="person-bio">{person.biography}</p>
              )}

              {/* Tabbed filmography */}
              <div className="person-known-for">
                {/* Tabs row */}
                <div className="browse-tabs" style={{ marginBottom: 12, justifyContent: 'center' }}>
                  {FILMOGRAPHY_TABS.filter(tab => {
                    if (tab === 'Directed') return filmDirected.length > 0
                    return true
                  }).map(tab => (
                    <button
                      key={tab}
                      className={`browse-tab${activeTab === tab ? ' browse-tab--active' : ''}`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Sort toggle — below tabs, all tabs */}
                <div className="person-sort-toggle">
                  <button
                    className={`person-sort-btn${sortOrder === 'desc' ? ' person-sort-btn--active' : ''}`}
                    onClick={() => setSortOrder('desc')}
                  >
                    Newest
                  </button>
                  <button
                    className={`person-sort-btn${sortOrder === 'asc' ? ' person-sort-btn--active' : ''}`}
                    onClick={() => setSortOrder('asc')}
                  >
                    Oldest
                  </button>
                </div>

                {activeTab === 'Known For' && movies.length > 0 && (
                  <div className="person-known-for-scroll">
                    {sortedKnownFor.map(movie => (
                      <Card key={`${movie.mediaType}-${movie.id}`} movie={movie} mediaType={movie.mediaType} />
                    ))}
                  </div>
                )}
                {activeTab === 'Known For' && movies.length === 0 && (
                  <p className="person-bio" style={{ opacity: 0.5 }}>No credits found.</p>
                )}

                {activeTab === 'Films' && (
                  filmMovies.length > 0
                    ? <div className="person-filmography-grid">
                        {sortedFilms.map(movie => (
                          <Card key={`movie-${movie.id}`} movie={movie} mediaType="movie" />
                        ))}
                      </div>
                    : <p className="person-bio" style={{ opacity: 0.5 }}>No film credits found.</p>
                )}

                {activeTab === 'TV Shows' && (
                  filmTV.length > 0
                    ? <div className="person-filmography-grid">
                        {sortedTV.map(show => (
                          <Card key={`tv-${show.id}`} movie={show} mediaType="tv" />
                        ))}
                      </div>
                    : <p className="person-bio" style={{ opacity: 0.5 }}>No TV credits found.</p>
                )}

                {activeTab === 'Directed' && (
                  filmDirected.length > 0
                    ? <div className="person-filmography-grid">
                        {sortedDirected.map(item => (
                          <Card key={`${item.mediaType}-${item.id}`} movie={item} mediaType={item.mediaType} />
                        ))}
                      </div>
                    : <p className="person-bio" style={{ opacity: 0.5 }}>No directing credits found.</p>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}
