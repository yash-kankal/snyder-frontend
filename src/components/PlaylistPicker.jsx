'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import {
  getUserPlaylists, createPlaylist,
  addToPlaylist, removeFromPlaylist, getMoviePlaylists,
} from '../lib/movieActions'

const PICKER_W  = 220
const GAP       = 6
const MIN_ABOVE = 240

// True on real touch/mobile devices — used to switch to bottom sheet
const IS_TOUCH = typeof window !== 'undefined' && !window.matchMedia('(hover: hover) and (pointer: fine)').matches

function computePos(rect) {
  if (!rect) return { top: 8, left: 8, transformOrigin: 'top right' }
  const vw = window.innerWidth
  const vh = window.innerHeight

  let left = rect.right - PICKER_W
  if (left < 8)                 { left = Math.max(8, rect.left) }
  if (left + PICKER_W > vw - 8) { left = vw - PICKER_W - 8 }

  if (rect.top >= MIN_ABOVE) {
    return { bottom: vh - rect.top + GAP, left, transformOrigin: 'bottom right' }
  }
  return { top: rect.bottom + GAP, left, transformOrigin: 'top right' }
}

export default function PlaylistPicker({
  anchorRect,
  movieId, movieTitle, moviePosterPath,
  mediaType = 'movie',
  onClose, onSavedChange,
}) {
  const { user } = useAuth()
  const showToast = useToast()
  const [playlists, setPlaylists]     = useState([])
  const [inPlaylists, setInPlaylists] = useState([])
  const [loading, setLoading]         = useState(true)
  const [newName, setNewName]         = useState('')
  const [creating, setCreating]       = useState(false)
  const [showCreate, setShowCreate]   = useState(false)
  const [toggling, setToggling]       = useState(null)

  const pos = IS_TOUCH ? null : computePos(anchorRect)

  // Keep a ref to the latest onClose so the Escape handler never needs to be re-bound
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  // Lock background scroll — only once we know the picker UI will actually show.
  // If we apply it on every mount we get a visible flash/blackout on auto-save
  // (new account → create Library, or single playlist → add immediately).
  // NOTE: we use overflow:hidden only (no position:fixed) to avoid the mobile
  // black-flash caused by the body snapping to top before the -scrollY offset paints.
  useEffect(() => {
    if (loading) return
    const prevBody = document.body.style.overflow
    const prevHtml = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevBody
      document.documentElement.style.overflow = prevHtml
    }
  }, [loading])

  // Close on Escape — uses ref so listener never needs to be re-bound
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onCloseRef.current() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (!user) return
    Promise.all([
      getUserPlaylists(user.id),
      getMoviePlaylists(user.id, movieId),
    ]).then(async ([p, inP]) => {
      try {
        if (p.length === 0) {
          const library = await createPlaylist(user.id, 'Library')
          await addToPlaylist(user.id, library.id, movieId, movieTitle, moviePosterPath, mediaType)
          onSavedChange?.(true)
          showToast(`"${movieTitle}" saved to Library`)
          onClose()
          return
        }
        if (p.length === 1 && inP.length === 0) {
          await addToPlaylist(user.id, p[0].id, movieId, movieTitle, moviePosterPath, mediaType)
          onSavedChange?.(true)
          showToast(`"${movieTitle}" saved to ${p[0].name}`)
          onClose()
          return
        }
        setPlaylists(p)
        setInPlaylists(inP)
        setLoading(false)
        onSavedChange?.(inP.length > 0)
      } catch (e) {
        console.error(e)
        setLoading(false)
      }
    })
  }, [user, movieId])

  const toggle = async (playlist) => {
    if (toggling) return
    setToggling(playlist.id)
    const isIn = inPlaylists.includes(playlist.id)
    try {
      if (isIn) {
        await removeFromPlaylist(user.id, playlist.id, movieId)
        const next = inPlaylists.filter(id => id !== playlist.id)
        setInPlaylists(next)
        onSavedChange?.(next.length > 0)
      } else {
        await addToPlaylist(user.id, playlist.id, movieId, movieTitle, moviePosterPath, mediaType)
        const next = [...inPlaylists, playlist.id]
        setInPlaylists(next)
        onSavedChange?.(true)
        showToast(`"${movieTitle}" saved to ${playlist.name}`)
      }
    } catch (e) { console.error(e) }
    finally { setToggling(null); onClose() }
  }

  const handleCreate = async () => {
    if (!newName.trim() || creating) return
    setCreating(true)
    try {
      const playlist = await createPlaylist(user.id, newName.trim())
      setPlaylists(prev => [playlist, ...prev])
      setNewName('')
      setShowCreate(false)
    } catch (e) { console.error(e) }
    finally { setCreating(false) }
  }

  if (loading) return createPortal(null, document.body)

  // ── Shared inner content ──────────────────────────────────────
  const content = (
    <>
      <div className="picker-header">
        <span className="picker-title">Add to playlist</span>
        <button className="picker-close" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div className="picker-body">
        <div className="picker-list">
          {playlists.map(p => {
            const isIn = inPlaylists.includes(p.id)
            return (
              <button
                key={p.id}
                className={`picker-item${isIn ? ' picker-item--active' : ''}`}
                onClick={() => toggle(p)}
                disabled={toggling === p.id}
              >
                <span className="picker-item-check">
                  {isIn
                    ? <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/></svg>
                  }
                </span>
                <span className="picker-item-name">{p.name}</span>
              </button>
            )
          })}
        </div>

        {showCreate ? (
          <div className="picker-create">
            <input
              className="picker-input"
              placeholder="Playlist name…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <div className="picker-create-row">
              <button className="picker-btn-cancel" onClick={() => { setShowCreate(false); setNewName('') }}>Cancel</button>
              <button className="picker-btn-save" onClick={handleCreate} disabled={!newName.trim() || creating}>
                {creating ? '…' : 'Create'}
              </button>
            </div>
          </div>
        ) : (
          <button className="picker-new-btn" onClick={() => setShowCreate(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Playlist
          </button>
        )}
      </div>
    </>
  )

  // ── Mobile: bottom sheet ──────────────────────────────────────
  if (IS_TOUCH) {
    return createPortal(
      <>
        <div className="picker-dismiss" onMouseDown={e => { e.preventDefault(); onClose() }} onClick={onClose} />
        <div className="picker-sheet" onClick={e => e.stopPropagation()}>
          {content}
        </div>
      </>,
      document.body
    )
  }

  // ── Desktop: near-button popover ──────────────────────────────
  return createPortal(
    <>
      <div className="picker-dismiss" onMouseDown={e => { e.preventDefault(); onClose() }} />
      <div
        className="picker-popover"
        style={{ top: pos.top, bottom: pos.bottom, left: pos.left, transformOrigin: pos.transformOrigin }}
        onClick={e => e.stopPropagation()}
      >
        {content}
      </div>
    </>,
    document.body
  )
}
