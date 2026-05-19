'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSharedPlaylist, copySharedPlaylist } from '../lib/movieActions'
import { useAuth } from '../contexts/AuthContext'
import AuthModal from '../components/AuthModal'
import Spinner from '../components/Spinner'

function itemPath(item) {
  if (item.media_type === 'tv') return `/tv/${item.movie_id.replace('tv-', '')}`
  return `/movie/${item.movie_id}`
}

export default function SharedPlaylist({ routeToken } = {}) {
  const { shareToken: paramToken } = useParams() || {}
  const shareToken = routeToken || paramToken
  const router = useRouter()
  const { user } = useAuth()

  const [playlist, setPlaylist] = useState(null)
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [copying, setCopying]   = useState(false)
  const [saved, setSaved]       = useState(false)
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    getSharedPlaylist(shareToken)
      .then(({ playlist, items }) => { setPlaylist(playlist); setItems(items) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [shareToken])

  const handleCopy = async () => {
    if (!user) { setShowAuth(true); return }
    if (copying || saved) return
    setCopying(true)
    try {
      await copySharedPlaylist(user.id, shareToken, `${playlist.name}`)
      setSaved(true)
    } catch (e) {
      console.error(e)
    } finally {
      setCopying(false)
    }
  }

  if (loading) return (
    <main className="shared-pl-page shared-pl-page--center">
      <Spinner />
    </main>
  )

  if (notFound) return (
    <main className="shared-pl-page shared-pl-page--center">
      <div className="shared-pl-notfound">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shared-pl-notfound-icon">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
        </svg>
        <h2>Playlist not found</h2>
        <p>This link may have been removed or expired.</p>
        <Link href="/browse?section=movies" className="shared-pl-browse-btn">Browse movies</Link>
      </div>
    </main>
  )

  return (
    <main className="shared-pl-page">
      <div className="shared-pl-inner">

        <div className="shared-pl-header">
          <div className="shared-pl-header-text">
            <p className="shared-pl-eyebrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shared-pl-eyebrow-icon">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              Shared playlist
            </p>
            <h1 className="shared-pl-title">{playlist.name}</h1>
            {playlist.owner_name && (
              <p className="shared-pl-owner">by {playlist.owner_name}</p>
            )}
            <p className="shared-pl-count">{items.length} {items.length === 1 ? 'film' : 'films'}</p>
          </div>

          <button
            className={`shared-pl-copy-btn${saved ? ' shared-pl-copy-btn--saved' : ''}`}
            onClick={handleCopy}
            disabled={copying || saved}
          >
            {saved ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Saved to your playlists
              </>
            ) : copying ? (
              'Saving…'
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                {user ? 'Copy to my account' : 'Sign in to copy'}
              </>
            )}
          </button>
        </div>

        <div className="shared-pl-divider" />

        {items.length === 0 ? (
          <p className="shared-pl-empty">This playlist is empty.</p>
        ) : (
          <div className="shared-pl-grid">
            {items.map(item => (
              <button
                key={item.id}
                className="shared-pl-card"
                onClick={() => router.push(itemPath(item))}
              >
                <img
                  src={item.movie_poster_path
                    ? `https://image.tmdb.org/t/p/w342${item.movie_poster_path}`
                    : '/No-Poster.png'}
                  alt={item.movie_title}
                  className="shared-pl-poster"
                />
                <p className="shared-pl-card-title">{item.movie_title}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </main>
  )
}
