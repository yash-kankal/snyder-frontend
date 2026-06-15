'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import {
  getUserPlaylists, getAllPlaylistItemsBatch,
  getPlaylistItems, deletePlaylist, createPlaylist,
  removeFromPlaylist, updatePlaylist, enablePlaylistSharing, updatePlaylistOwnerName,
} from '../lib/movieActions'

function itemHref(item) {
  if (item.media_type === 'tv') return `/tv/${item.movie_id.replace('tv-', '')}`
  return `/movie/${item.movie_id}`
}

/* ── Full playlist expanded view ── */
function FullPlaylistView({ playlist: initialPlaylist, userId, onBack, onClose, onRename }) {
  const router = useRouter()
  const { user } = useAuth()
  const [playlist, setPlaylist]     = useState(initialPlaylist)
  const [items, setItems]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [editing, setEditing]       = useState(false)
  const [editName, setEditName]     = useState(initialPlaylist.name)
  const [saving, setSaving]         = useState(false)
  const [shareToken, setShareToken] = useState(initialPlaylist.share_token || null)
  const [shareCopied, setShareCopied] = useState(false)
  const editInputRef     = useRef(null)
  const shareCopiedTimer = useRef(null)
  useEffect(() => () => clearTimeout(shareCopiedTimer.current), [])

  useEffect(() => {
    // Hits module-level cache immediately after batch pre-warm
    getPlaylistItems(playlist.id).then(data => { setItems(data); setLoading(false) })
  }, [playlist.id])

  useEffect(() => {
    if (!editing) return
    // Delay focus so iOS doesn't zoom: firing focus on the same tick as the
    // DOM insertion triggers the auto-zoom even at font-size 16px.
    const t = setTimeout(() => {
      editInputRef.current?.focus()
      editInputRef.current?.select()
    }, 50)
    return () => clearTimeout(t)
  }, [editing])

  const go = (item) => { onClose(); router.push(itemHref(item)) }
  const remove = async (e, item) => {
    e.stopPropagation()
    await removeFromPlaylist(userId, playlist.id, item.movie_id)
    setItems(prev => prev.filter(i => i.id !== item.id))
  }

  const startEdit = () => { setEditName(playlist.name); setEditing(true) }
  const cancelEdit = () => { setEditing(false); setEditName(playlist.name) }
  const saveEdit = async () => {
    const trimmed = editName.trim()
    if (!trimmed || trimmed === playlist.name || saving) return
    setSaving(true)
    try {
      const updated = await updatePlaylist(userId, playlist.id, trimmed)
      setPlaylist(updated)
      onRename?.(playlist.id, updated.name)
    } catch (e) { console.error(e) }
    finally { setSaving(false); setEditing(false) }
  }
  const handleEditKey = (e) => {
    if (e.key === 'Enter') saveEdit()
    if (e.key === 'Escape') cancelEdit()
  }

  const handleShare = async () => {
    const ownerName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''
    let token = shareToken
    if (!token) {
      // First share — generate a token and stamp owner_name
      token = await enablePlaylistSharing(userId, playlist.id, ownerName)
      setShareToken(token)
    } else {
      // Already shared — only update owner_name, keep the existing token intact
      await updatePlaylistOwnerName(userId, playlist.id, ownerName)
    }
    const url = `${window.location.origin}/playlist/${token}`
    await navigator.clipboard.writeText(url)
    setShareCopied(true)
    clearTimeout(shareCopiedTimer.current)
    shareCopiedTimer.current = setTimeout(() => setShareCopied(false), 2000)
  }

  return (
    <div className="pm-modal" onClick={e => e.stopPropagation()}>
      <div className="pm-header">
        <div className="pm-header-back">
          <button className="pm-back-btn" onClick={onBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <div className="pm-title-edit-wrap">
            {editing ? (
              <div className="pm-title-edit-row">
                <input
                  ref={editInputRef}
                  className="pm-title-input"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={handleEditKey}
                  maxLength={80}
                />
                <button className="pm-title-save-btn" onClick={saveEdit} disabled={!editName.trim() || saving}>
                  {saving ? '…' : 'Save'}
                </button>
                <button className="pm-title-cancel-btn" onClick={cancelEdit}>Cancel</button>
              </div>
            ) : (
              <div className="pm-title-view-row">
                <h2 className="pm-title">{playlist.name}</h2>
                <button className="pm-title-edit-btn" onClick={startEdit} title="Rename playlist">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="pm-header-right">
          <button
            className={`pm-share-btn${shareCopied ? ' pm-share-btn--copied' : ''}${editing ? ' pm-share-btn--hidden' : ''}`}
            onClick={handleShare}
            title={shareCopied ? 'Link copied!' : 'Copy share link'}
          >
            {shareCopied ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                Share
              </>
            )}
          </button>
          <button className="pm-close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="pm-body" data-lenis-prevent>
        {!loading && items.length > 0 && (
          <p className="pm-playlist-count">{items.length} {items.length === 1 ? 'title' : 'titles'}</p>
        )}
        {loading ? (
          <div className="pm-full-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="pm-grid-card-wrap">
                <div className="pm-grid-card-skeleton"><div className="pm-skeleton-shimmer" /></div>
                <div className="pm-skeleton-title-bar" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="pm-status">Nothing added yet.</p>
        ) : (
          <div className="pm-full-grid">
            {items.map(item => (
              <div key={item.id} className="pm-grid-card-wrap">
                <button className="pm-grid-card" onClick={() => go(item)}>
                  <img
                    src={item.movie_poster_path
                      ? `https://image.tmdb.org/t/p/w342${item.movie_poster_path}`
                      : '/No-Poster.png'}
                    alt={item.movie_title}
                    className="pm-grid-card-img"
                  />
                </button>
                <button className="pm-item-remove" onClick={e => remove(e, item)} title="Remove">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
                <p className="pm-grid-card-title">{item.movie_title}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Horizontal playlist row ── */
function PlaylistRow({ playlist, userId, onDelete, onOpen, onClose, initialItems }) {
  const router  = useRouter()
  const { user }  = useAuth()
  const scrollRef      = useRef(null)
  const shareCopiedTimer = useRef(null)
  const [items, setItems]           = useState(initialItems)
  const [shareToken, setShareToken] = useState(playlist.share_token || null)
  const [shareCopied, setShareCopied] = useState(false)
  useEffect(() => () => clearTimeout(shareCopiedTimer.current), [])

  const scroll = (dir) => scrollRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' })
  const go = (item) => { onClose(); router.push(itemHref(item)) }
  const remove = async (e, item) => {
    e.stopPropagation()
    await removeFromPlaylist(userId, playlist.id, item.movie_id)
    setItems(prev => prev.filter(i => i.id !== item.id))
  }

  const handleShare = async (e) => {
    e.stopPropagation()
    const ownerName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''
    let token = shareToken
    if (!token) {
      // First share — generate a token and stamp owner_name
      token = await enablePlaylistSharing(userId, playlist.id, ownerName)
      setShareToken(token)
    } else {
      // Already shared — only update owner_name, keep the existing token intact
      await updatePlaylistOwnerName(userId, playlist.id, ownerName)
    }
    await navigator.clipboard.writeText(`${window.location.origin}/playlist/${token}`)
    setShareCopied(true)
    clearTimeout(shareCopiedTimer.current)
    shareCopiedTimer.current = setTimeout(() => setShareCopied(false), 2000)
  }

  return (
    <div className="pm-playlist">
      <div className="pm-playlist-header">
        <button className="pm-playlist-name-btn" onClick={() => onOpen(playlist, items)}>
          <h3 className="pm-playlist-name">{playlist.name}</h3>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="pm-playlist-chevron">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
        <div className="pm-playlist-actions">
          <span className="pm-playlist-count">{items.length} {items.length === 1 ? 'title' : 'titles'}</span>
          {items.length > 2 && (
            <>
              <button className="pm-scroll-arrow" onClick={() => scroll(-1)} aria-label="Scroll left">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <button className="pm-scroll-arrow" onClick={() => scroll(1)} aria-label="Scroll right">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </>
          )}
          <button
            className={`pm-share-btn${shareCopied ? ' pm-share-btn--copied' : ''}`}
            onClick={handleShare}
            title={shareCopied ? 'Link copied!' : 'Share playlist'}
          >
            {shareCopied ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            )}
          </button>
          <button className="pm-delete-btn" onClick={() => onDelete(playlist.id)} title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="pm-empty">Nothing added yet.</p>
      ) : (
        <div className="pm-scroll" ref={scrollRef}>
          {items.map(item => (
            <div key={item.id} className="pm-poster-wrap">
              <button className="pm-poster" onClick={() => go(item)}>
                <img
                  src={item.movie_poster_path
                    ? `https://image.tmdb.org/t/p/w185${item.movie_poster_path}`
                    : '/No-Poster.png'}
                  alt={item.movie_title}
                />
              </button>
              <button className="pm-item-remove" onClick={e => remove(e, item)} title="Remove">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
              <p className="pm-poster-title">{item.movie_title}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Skeleton rows shown while the modal is loading ── */
function PlaylistRowSkeleton() {
  return (
    <div className="pm-playlist">
      <div className="pm-playlist-header">
        <div className="pm-skeleton-name" />
        <div className="pm-skeleton-count" />
      </div>
      <div className="pm-row-loading">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="pm-poster-skeleton">
            <div className="pm-skeleton-shimmer" />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Main modal ── */
export default function PlaylistsModal({ onClose, autoCreate = false }) {
  const { user } = useAuth()
  const [playlists, setPlaylists]           = useState([])
  const [itemsByPlaylist, setItemsByPlaylist] = useState({})
  const [loading, setLoading]               = useState(true)
  const [showCreate, setShowCreate]         = useState(autoCreate)
  const [newName, setNewName]               = useState('')
  const [creating, setCreating]             = useState(false)
  const [selected, setSelected]             = useState(null) // { playlist, items }

  // Lock background scroll while modal is open
  useEffect(() => {
    const scrollY = window.scrollY
    const prevBody = document.body.style.cssText
    document.body.style.cssText = `overflow:hidden;position:fixed;top:-${scrollY}px;left:0;right:0;`
    return () => {
      document.body.style.cssText = prevBody
      window.scrollTo(0, scrollY)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    getUserPlaylists(user.id).then(async rawData => {
      const ownerName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''

      // Silently backfill owner_name for playlists created before this field was added
      let data = rawData
      if (ownerName) {
        const toFix = rawData.filter(p => !p.owner_name)
        if (toFix.length) {
          // Fire-and-forget DB writes so the shared link shows the name immediately
          toFix.forEach(p => updatePlaylistOwnerName(user.id, p.id, ownerName).catch(() => {}))
          // Update local copies right away so share button uses the correct name
          data = rawData.map(p => p.owner_name ? p : { ...p, owner_name: ownerName })
        }
      }

      setPlaylists(data)
      if (data.length > 0) {
        // One batch Supabase query replaces N individual queries
        const byPlaylist = await getAllPlaylistItemsBatch(data.map(p => p.id))
        setItemsByPlaylist(byPlaylist)
      }
      setLoading(false)
    })
  }, [user])

  const handleCreate = async () => {
    if (!newName.trim() || creating) return
    setCreating(true)
    try {
      const ownerName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''
      const p = await createPlaylist(user.id, newName.trim(), ownerName)
      setPlaylists(prev => [p, ...prev])
      setItemsByPlaylist(prev => ({ ...prev, [p.id]: [] }))
      setNewName('')
      setShowCreate(false)
    } catch (e) { console.error(e) }
    finally { setCreating(false) }
  }

  const handleDelete = async (playlistId) => {
    await deletePlaylist(user.id, playlistId)
    setPlaylists(prev => prev.filter(p => p.id !== playlistId))
    setItemsByPlaylist(prev => { const n = { ...prev }; delete n[playlistId]; return n })
  }

  const handleOpen = (playlist, items) => setSelected({ playlist, items })

  const handleRename = (playlistId, newName) => {
    setPlaylists(prev => prev.map(p => p.id === playlistId ? { ...p, name: newName } : p))
  }

  return createPortal(
    <div className="pm-overlay" onClick={onClose}>
      {selected ? (
        <FullPlaylistView
          playlist={selected.playlist}
          userId={user.id}
          onBack={() => setSelected(null)}
          onClose={onClose}
          onRename={handleRename}
        />
      ) : (
        <div className="pm-modal" onClick={e => e.stopPropagation()}>
          <div className="pm-header">
            <h2 className="pm-title">My Playlists</h2>
            <div className="pm-header-actions">
              {!showCreate && (
                <button className="pm-create-btn" onClick={() => setShowCreate(true)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  New Playlist
                </button>
              )}
              <button className="pm-close-btn" onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          {showCreate && (
            <div className="pm-new-form">
              <input
                className="pm-new-input"
                placeholder="Give your playlist a name…"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
              <div className="pm-new-row">
                <button className="pm-new-cancel" onClick={() => { setShowCreate(false); setNewName('') }}>Cancel</button>
                <button className="pm-new-save" onClick={handleCreate} disabled={!newName.trim() || creating}>
                  {creating ? '…' : 'Create'}
                </button>
              </div>
            </div>
          )}

          <div className="pm-body" data-lenis-prevent>
            {loading ? (
              <>
                <PlaylistRowSkeleton />
                <PlaylistRowSkeleton />
                <PlaylistRowSkeleton />
              </>
            ) : playlists.length === 0 ? (
              <p className="pm-status">No playlists yet. Hit "New Playlist" to get started.</p>
            ) : (
              playlists.map(p => (
                <PlaylistRow
                  key={p.id}
                  playlist={p}
                  userId={user.id}
                  onDelete={handleDelete}
                  onOpen={handleOpen}
                  onClose={onClose}
                  initialItems={itemsByPlaylist[p.id] || []}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}
