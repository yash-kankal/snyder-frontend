'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Spinner from '../components/Spinner'
import Card from '../components/Card'
import { API_BASE_URL, API_OPTIONS } from '../config'
import { cachedFetch, TTL } from '../lib/apiCache'
import { usePageMeta } from '../lib/usePageMeta'
import ErrorState from '../components/ErrorState'

const FILMOGRAPHY_TABS = ['Known For', 'Films', 'TV Shows', 'Directed', 'Photos']

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
  const [wikipediaUrl, setWikipediaUrl] = useState(null)
  const [bioExpanded, setBioExpanded] = useState(false)
  const [photos, setPhotos] = useState([])
  const [lightboxIndex, setLightboxIndex] = useState(null)

  // Lock page scroll on desktop only
  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth < 768) return
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
          `${API_BASE_URL}/person/${id}?append_to_response=combined_credits,external_ids,images`,
          API_OPTIONS, TTL.detail
        )
        if (cancelled) return
        setPerson(data)

        const profiles = (data.images?.profiles || [])
          .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
        setPhotos(profiles)

        // Fetch Wikipedia URL from Wikidata if available
        const wikidataId = data.external_ids?.wikidata_id
        if (wikidataId) {
          fetch(
            `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${wikidataId}&props=sitelinks&sitelinkfilter=enwiki&format=json&origin=*`
          )
            .then(r => r.json())
            .then(wd => {
              const title = wd?.entities?.[wikidataId]?.sitelinks?.enwiki?.title
              if (title && !cancelled) setWikipediaUrl(`https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`)
            })
            .catch(() => {})
        }

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

  const closeLightbox = useCallback(() => setLightboxIndex(null), [])
  const prevPhoto = useCallback(() => setLightboxIndex(i => (i - 1 + photos.length) % photos.length), [photos.length])
  const nextPhoto = useCallback(() => setLightboxIndex(i => (i + 1) % photos.length), [photos.length])

  useEffect(() => {
    if (lightboxIndex === null) return
    const handler = (e) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') prevPhoto()
      if (e.key === 'ArrowRight') nextPhoto()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxIndex, closeLightbox, prevPhoto, nextPhoto])

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
    return <ErrorState message={error || "This person doesn't exist or the link has expired."} />
  }

  const birthday = formatBirthday(person.birthday)

  return (
    <main className="person-page-main">
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
            <div className="person-external-links" style={{ marginTop: '6px' }}>
              {person.external_ids?.imdb_id && (
                <a href={`https://www.imdb.com/name/${person.external_ids.imdb_id}`} target="_blank" rel="noopener noreferrer" className="person-ext-link person-ext-link--imdb" title="IMDb">
                  <svg viewBox="0 0 24 24" fill="#F5C518"><path d="M14.31 9.588v.005c-.077-.048-.227-.07-.42-.07v4.815c.27 0 .44-.06.5-.18.062-.12.095-.405.095-.857v-3c0-.33-.012-.547-.04-.652a.344.344 0 0 0-.135-.061zM12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zM7.562 15.108H6.055V8.892h1.507v6.216zm4.16 0H10.35v-.504c-.176.2-.36.348-.553.447a1.376 1.376 0 0 1-.625.145c-.272 0-.47-.075-.592-.227-.12-.152-.182-.395-.182-.73V9.773h1.354v4.076c0 .163.016.27.048.325.033.055.09.082.17.082.1 0 .196-.05.286-.148.09-.098.135-.204.135-.315V9.773h1.33v5.335zm4.43-.616c0 .31-.027.543-.08.697a.686.686 0 0 1-.27.37c-.128.09-.28.147-.456.172a3.851 3.851 0 0 1-.57.038h-1.73V8.892h1.57c.368 0 .64.022.814.067.175.044.32.124.435.238.114.113.19.248.228.403.038.155.058.41.058.763v3.13z"/></svg>
                  IMDb
                </a>
              )}
              {person.external_ids?.instagram_id && (
                <a href={`https://www.instagram.com/${person.external_ids.instagram_id}`} target="_blank" rel="noopener noreferrer" className="person-ext-link person-ext-link--ig" title="Instagram">
                  <svg viewBox="0 0 24 24" fill="#E1306C"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
                  Instagram
                </a>
              )}
              {person.external_ids?.twitter_id && (
                <a href={`https://twitter.com/${person.external_ids.twitter_id}`} target="_blank" rel="noopener noreferrer" className="person-ext-link person-ext-link--x" title="X / Twitter">
                  <svg viewBox="0 0 24 24" fill="#ffffff"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  X
                </a>
              )}
              {wikipediaUrl && (
                <a href={wikipediaUrl} target="_blank" rel="noopener noreferrer" className="person-ext-link person-ext-link--wiki" title="Wikipedia">
                  <svg viewBox="0 0 24 24" fill="#fff"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 1.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zm-1.08 3.5L8.5 12.64l-1.17-4.64H5.75l1.92 6.5h1.5l1.75-4.5 1.75 4.5h1.5l1.92-6.5h-1.58L13.5 12.64 11.08 7z"/></svg>
                  Wiki
                </a>
              )}
            </div>
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
            <div className="person-meta-card detail-card" data-lenis-prevent>
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
            <div className="person-name-row desktop-only-name-row">
              <h1 className="detail-title">{person.name}</h1>
              <div className="person-external-links">
                {person.external_ids?.imdb_id && (
                  <a href={`https://www.imdb.com/name/${person.external_ids.imdb_id}`} target="_blank" rel="noopener noreferrer" className="person-ext-link person-ext-link--imdb" title="IMDb">
                    <svg viewBox="0 0 24 24" fill="#F5C518"><path d="M14.31 9.588v.005c-.077-.048-.227-.07-.42-.07v4.815c.27 0 .44-.06.5-.18.062-.12.095-.405.095-.857v-3c0-.33-.012-.547-.04-.652a.344.344 0 0 0-.135-.061zM12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zM7.562 15.108H6.055V8.892h1.507v6.216zm4.16 0H10.35v-.504c-.176.2-.36.348-.553.447a1.376 1.376 0 0 1-.625.145c-.272 0-.47-.075-.592-.227-.12-.152-.182-.395-.182-.73V9.773h1.354v4.076c0 .163.016.27.048.325.033.055.09.082.17.082.1 0 .196-.05.286-.148.09-.098.135-.204.135-.315V9.773h1.33v5.335zm4.43-.616c0 .31-.027.543-.08.697a.686.686 0 0 1-.27.37c-.128.09-.28.147-.456.172a3.851 3.851 0 0 1-.57.038h-1.73V8.892h1.57c.368 0 .64.022.814.067.175.044.32.124.435.238.114.113.19.248.228.403.038.155.058.41.058.763v3.13z"/></svg>
                    IMDb
                  </a>
                )}
                {person.external_ids?.instagram_id && (
                  <a href={`https://www.instagram.com/${person.external_ids.instagram_id}`} target="_blank" rel="noopener noreferrer" className="person-ext-link person-ext-link--ig" title="Instagram">
                    <svg viewBox="0 0 24 24" fill="#E1306C"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
                    Instagram
                  </a>
                )}
                {person.external_ids?.twitter_id && (
                  <a href={`https://twitter.com/${person.external_ids.twitter_id}`} target="_blank" rel="noopener noreferrer" className="person-ext-link person-ext-link--x" title="X / Twitter">
                    <svg viewBox="0 0 24 24" fill="#ffffff"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    X
                  </a>
                )}
                {wikipediaUrl && (
                  <a href={wikipediaUrl} target="_blank" rel="noopener noreferrer" className="person-ext-link person-ext-link--wiki" title="Wikipedia">
                    <svg viewBox="0 0 24 24" fill="#fff"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 1.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zm-1.08 3.5L8.5 12.64l-1.17-4.64H5.75l1.92 6.5h1.5l1.75-4.5 1.75 4.5h1.5l1.92-6.5h-1.58L13.5 12.64 11.08 7z"/></svg>
                    Wiki
                  </a>
                )}
              </div>
            </div>

            {/* Only this inner div scrolls */}
            <div className="person-info-scroll" data-lenis-prevent>
              {person.biography && (
                <div>
                  <p className={`person-bio${bioExpanded ? '' : ' person-bio--clamped'}`}>{person.biography}</p>
                  {person.biography.length > 420 && (
                    <button className="person-bio-toggle" onClick={() => setBioExpanded(e => !e)}>
                      {bioExpanded ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </div>
              )}

              {/* Tabbed filmography */}
              <div className="person-known-for">
                {/* Tabs row */}
                <div className="browse-tabs" style={{ marginBottom: 12, justifyContent: 'center' }}>
                  {FILMOGRAPHY_TABS.filter(tab => {
                    if (tab === 'Directed') return filmDirected.length > 0
                    if (tab === 'Photos') return photos.length > 0
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

                {/* Sort toggle — hidden on Photos tab */}
                <div className="person-sort-toggle" style={{ visibility: activeTab === 'Photos' ? 'hidden' : 'visible' }}>
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
                    {sortedKnownFor.map((movie, i) => (
                      <Card key={`${movie.mediaType}-${movie.id}-${i}`} movie={movie} mediaType={movie.mediaType} />
                    ))}
                  </div>
                )}
                {activeTab === 'Known For' && movies.length === 0 && (
                  <p className="person-bio" style={{ opacity: 0.5 }}>No credits found.</p>
                )}

                {activeTab === 'Films' && (
                  filmMovies.length > 0
                    ? <div className="person-filmography-grid">
                        {sortedFilms.map((movie, i) => (
                          <Card key={`movie-${movie.id}-${i}`} movie={movie} mediaType="movie" />
                        ))}
                      </div>
                    : <p className="person-bio" style={{ opacity: 0.5 }}>No film credits found.</p>
                )}

                {activeTab === 'TV Shows' && (
                  filmTV.length > 0
                    ? <div className="person-filmography-grid">
                        {sortedTV.map((show, i) => (
                          <Card key={`tv-${show.id}-${i}`} movie={show} mediaType="tv" />
                        ))}
                      </div>
                    : <p className="person-bio" style={{ opacity: 0.5 }}>No TV credits found.</p>
                )}

                {activeTab === 'Directed' && (
                  filmDirected.length > 0
                    ? <div className="person-filmography-grid">
                        {sortedDirected.map((item, i) => (
                          <Card key={`${item.mediaType}-${item.id}-${i}`} movie={item} mediaType={item.mediaType} />
                        ))}
                      </div>
                    : <p className="person-bio" style={{ opacity: 0.5 }}>No directing credits found.</p>
                )}

                {activeTab === 'Photos' && photos.length > 0 && (
                  <div className="person-photos-grid">
                    {photos.map((photo, i) => (
                      <button
                        key={photo.file_path}
                        className="person-photo-thumb"
                        onClick={() => setLightboxIndex(i)}
                        aria-label={`View photo ${i + 1}`}
                      >
                        <img
                          src={`https://image.tmdb.org/t/p/w185${photo.file_path}`}
                          alt=""
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Photo lightbox */}
          {lightboxIndex !== null && (
            <div className="person-lightbox" onClick={closeLightbox}>
              <button className="person-lightbox-close" onClick={closeLightbox} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <button className="person-lightbox-arrow person-lightbox-arrow--prev" onClick={e => { e.stopPropagation(); prevPhoto() }} aria-label="Previous">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div className="person-lightbox-img-wrap" onClick={e => e.stopPropagation()}>
                <img
                  src={`https://image.tmdb.org/t/p/w780${photos[lightboxIndex].file_path}`}
                  alt=""
                  className="person-lightbox-img"
                />
                <span className="person-lightbox-count">{lightboxIndex + 1} / {photos.length}</span>
              </div>
              <button className="person-lightbox-arrow person-lightbox-arrow--next" onClick={e => { e.stopPropagation(); nextPhoto() }} aria-label="Next">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          )}

        </div>
      </div>
    </main>
  )
}
