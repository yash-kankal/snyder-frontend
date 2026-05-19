'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getComments, addComment, deleteComment } from '../lib/movieActions'

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60)   return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Avatar({ name, size = 36 }) {
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const hue = [...(name || '')].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <div
      className="comment-avatar"
      style={{ width: size, height: size, minWidth: size, background: `hsl(${hue},55%,40%)` }}
    >
      {initials}
    </div>
  )
}

export default function CommentsSection({ movieId, tmdbReviews = [] }) {
  const { user } = useAuth()
  const [comments, setComments]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [text, setText]           = useState('')
  const [posting, setPosting]     = useState(false)
  const [error, setError]         = useState('')
  const [expanded, setExpanded]   = useState({})
  const textareaRef               = useRef(null)

  const username = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Anonymous'

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getComments(movieId)
      .then(data => { if (!cancelled) { setComments(data); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [movieId])

  const handlePost = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed || !user || posting) return
    setPosting(true)
    setError('')
    try {
      const newComment = await addComment(user.id, movieId, username, trimmed)
      setComments(prev => [newComment, ...prev])
      setText('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    } catch {
      setError('Failed to post. Please try again.')
    } finally {
      setPosting(false)
    }
  }, [text, user, posting, movieId, username])

  const handleDelete = useCallback(async (commentId) => {
    if (!user) return
    setComments(prev => prev.filter(c => c.id !== commentId))
    try {
      await deleteComment(commentId, user.id)
    } catch {
      getComments(movieId).then(setComments)
    }
  }, [user, movieId])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePost()
  }

  const autoResize = (e) => {
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }

  const totalCuedUp = comments.length
  const filteredReviews = tmdbReviews.slice(0, 8)

  return (
    <section className="comments-section" id="comments-section">

      {/* ── Header ── */}
      <div className="comments-header">
        <h2 className="comments-title">
          Comments
          {totalCuedUp > 0 && <span className="comments-count">{totalCuedUp}</span>}
        </h2>
      </div>

      {/* ── Compose box ── */}
      {user ? (
        <div className="comment-compose">
          <Avatar name={username} />
          <div className="comment-compose-right">
            <textarea
              ref={textareaRef}
              className="comment-input"
              placeholder="Add a comment…"
              value={text}
              onChange={e => { setText(e.target.value); autoResize(e) }}
              onKeyDown={handleKeyDown}
              rows={1}
              maxLength={1000}
            />
            <div className="comment-compose-actions">
              <span className="comment-char-count">{text.length > 0 ? `${text.length}/1000` : ''}</span>
              <button className="comment-cancel-btn" onClick={() => { setText(''); if (textareaRef.current) textareaRef.current.style.height = 'auto' }}>Cancel</button>
              <button className="comment-post-btn" onClick={handlePost} disabled={posting || !text.trim()}>
                {posting ? 'Posting…' : 'Comment'}
              </button>
            </div>
            {error && <p className="comment-error">{error}</p>}
          </div>
        </div>
      ) : (
        <p className="comments-signin-hint">Sign in to leave a comment</p>
      )}

      {/* ── CuedUp Comments ── */}
      {loading ? (
        <div className="comments-loading">
          {[1,2,3].map(i => <div key={i} className="comment-skeleton" />)}
        </div>
      ) : comments.length === 0 ? null : (
        <ul className="comments-list">
          {comments.map(c => {
            const isLong   = c.content.length > 280
            const isExpanded = expanded[c.id]
            return (
              <li key={c.id} className="comment-item">
                <Avatar name={c.username} />
                <div className="comment-body">
                  <div className="comment-meta">
                    <span className="comment-username">{c.username}</span>
                    <span className="comment-time">{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="comment-text">
                    {isLong && !isExpanded ? c.content.slice(0, 280) + '…' : c.content}
                  </p>
                  {isLong && (
                    <button className="comment-read-more" onClick={() => setExpanded(prev => ({ ...prev, [c.id]: !prev[c.id] }))}>
                      {isExpanded ? 'Show less' : 'Read more'}
                    </button>
                  )}
                  {user?.id === c.user_id && (
                    <button className="comment-delete-btn" onClick={() => handleDelete(c.id)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                      Delete
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* ── TMDB Reviews ── */}
      {filteredReviews.length > 0 && (
        <>
          <div className="tmdb-reviews-divider">
            <span>From the Web · TMDB Reviews</span>
          </div>
          <ul className="comments-list tmdb-reviews-list">
            {filteredReviews.map(r => {
              const isLong     = (r.content || '').length > 280
              const isExpanded = expanded[`tmdb-${r.id}`]
              return (
                <li key={r.id} className="comment-item">
                  <Avatar name={r.author} size={36} />
                  <div className="comment-body">
                    <div className="comment-meta">
                      <span className="comment-username">{r.author}</span>
                      {r.author_details?.rating && (
                        <span className="tmdb-review-rating">
                          ★ {r.author_details.rating}/10
                        </span>
                      )}
                      <span className="comment-time">{timeAgo(r.created_at)}</span>
                    </div>
                    <p className="comment-text">
                      {isLong && !isExpanded ? r.content.slice(0, 280) + '…' : r.content}
                    </p>
                    {isLong && (
                      <button className="comment-read-more" onClick={() => setExpanded(prev => ({ ...prev, [`tmdb-${r.id}`]: !prev[`tmdb-${r.id}`] }))}>
                        {isExpanded ? 'Show less' : 'Read more'}
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}

    </section>
  )
}
