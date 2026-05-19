'use client'
import { useState, useEffect, useRef, memo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getUserRating, setUserRating, removeUserRating, getRatingCounts,
} from '../lib/movieActions'

const RATINGS = [
  {
    key: 'dont_watch',
    label: "Don't Watch",
    color: '#f87171',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M15 9l-6 6M9 9l6 6"/>
      </svg>
    ),
  },
  {
    key: 'good_watch',
    label: 'Good Watch',
    color: '#AB8BFF',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/>
        <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
      </svg>
    ),
  },
  {
    key: 'must_watch',
    label: 'Must Watch',
    color: '#4ade80',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
  },
]

const R = 38
const CIRC = 2 * Math.PI * R
const SEGMENT_STYLE = { transform: 'rotate(-90deg)', transformOrigin: '50px 50px' }

const DonutChart = memo(function DonutChart({ counts }) {
  const total = counts.dont_watch + counts.good_watch + counts.must_watch

  if (total === 0) {
    return (
      <svg viewBox="0 0 100 100" className="cuedup-pie">
        <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(206,206,251,0.07)" strokeWidth="20"/>
        <text x="50" y="48" textAnchor="middle" fill="rgba(168,181,219,0.25)" fontSize="8" fontFamily="DM Sans,sans-serif">No</text>
        <text x="50" y="58" textAnchor="middle" fill="rgba(168,181,219,0.25)" fontSize="8" fontFamily="DM Sans,sans-serif">ratings</text>
      </svg>
    )
  }

  const segments = RATINGS.map(r => ({ color: r.color, value: counts[r.key] }))
  let cumOffset = 0

  return (
    <svg viewBox="0 0 100 100" className="cuedup-pie">
      <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(206,206,251,0.05)" strokeWidth="20"/>
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * CIRC
        const startOffset = cumOffset
        cumOffset += dash
        if (dash === 0) return null
        return (
          <circle
            key={i}
            cx="50" cy="50" r={R}
            fill="none"
            stroke={seg.color}
            strokeWidth="20"
            strokeDasharray={`${dash} ${CIRC - dash}`}
            strokeDashoffset={CIRC - startOffset}
            style={SEGMENT_STYLE}
          />
        )
      })}
      <text x="50" y="44" textAnchor="middle" fill="white" fontSize="16" fontWeight="800" fontFamily="DM Sans,sans-serif">{total}</text>
      <text x="50" y="57" textAnchor="middle" fill="rgba(168,181,219,0.4)" fontSize="7.5" fontFamily="DM Sans,sans-serif" letterSpacing="0.8">RATINGS</text>
    </svg>
  )
})

export default function CuedUpRating({ movieId, movieTitle, moviePosterPath }) {
  const { user } = useAuth()
  const [userRating, setLocalRating] = useState(null)
  const [counts, setCounts] = useState({ dont_watch: 0, good_watch: 0, must_watch: 0 })
  const [loading, setLoading] = useState(true)  // true until counts arrive
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)  // prevents double-fire before state updates

  // Counts fetch: only when movieId changes, not on auth changes
  useEffect(() => {
    let cancelled = false
    getRatingCounts(movieId).then(c => { if (!cancelled) { setCounts(c); setLoading(false) } })
    return () => { cancelled = true }
  }, [movieId])

  // User rating: only when user or movieId changes
  useEffect(() => {
    if (!user) { setLocalRating(null); return }
    let cancelled = false
    getUserRating(user.id, movieId).then(r => { if (!cancelled) setLocalRating(r) })
    return () => { cancelled = true }
  }, [user, movieId])

  const handleRate = async (key) => {
    if (!user || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    try {
      if (userRating === key) {
        await removeUserRating(user.id, movieId)
        setCounts(prev => ({ ...prev, [key]: Math.max(0, prev[key] - 1) }))
        setLocalRating(null)
      } else {
        const next = { ...counts }
        if (userRating) next[userRating] = Math.max(0, next[userRating] - 1)
        next[key]++
        await setUserRating(user.id, movieId, movieTitle, moviePosterPath, key)
        setCounts(next)
        setLocalRating(key)
      }
    } catch (e) {
      console.error(e)
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const total = counts.dont_watch + counts.good_watch + counts.must_watch

  return (
    <div className="detail-card cuedup-rating-card">
      {/* Header */}
      <div className="cuedup-header">
        <img src="/PopCorn.png" alt="" className="cuedup-logo" />
        <span className="cuedup-label">CuedUp Rating</span>
        {!user && !loading && (
          <span className="cuedup-signin-hint">· Sign in to vote</span>
        )}
      </div>

      {/* Vote buttons */}
      <div className="cuedup-buttons">
        {RATINGS.map(r => (
          <button
            key={r.key}
            className={`cuedup-btn cuedup-btn--${r.key}${userRating === r.key ? ' cuedup-btn--active' : ''}`}
            onClick={() => handleRate(r.key)}
            disabled={saving || loading || !user}
            title={!user ? 'Sign in to rate' : undefined}
          >
            <span className="cuedup-btn-icon">{r.icon}</span>
            <span className="cuedup-btn-label">{r.label}</span>
          </button>
        ))}
      </div>

      {/* Chart + legend (or skeleton while loading) */}
      <div className="cuedup-chart-row">
        {loading ? (
          <>
            <div className="cuedup-donut-wrap cuedup-donut-skeleton" />
            <div className="cuedup-legend">
              {[1, 2, 3].map(i => (
                <div key={i} className="cuedup-legend-item">
                  <span className="cuedup-skel cuedup-skel--dot" />
                  <span className="cuedup-skel cuedup-skel--name" />
                  <div className="cuedup-legend-bar-wrap">
                    <span className="cuedup-skel cuedup-skel--bar" />
                  </div>
                  <span className="cuedup-skel cuedup-skel--pct" />
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="cuedup-donut-wrap">
              <DonutChart counts={counts} />
            </div>
            <div className="cuedup-legend">
              {RATINGS.map(r => {
                const count = counts[r.key]
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                return (
                  <div key={r.key} className="cuedup-legend-item">
                    <span className="cuedup-legend-dot" style={{ background: r.color }} />
                    <span className="cuedup-legend-name">{r.label}</span>
                    <div className="cuedup-legend-bar-wrap">
                      <div
                        className="cuedup-legend-bar-fill"
                        style={{ width: `${pct}%`, background: r.color }}
                      />
                    </div>
                    <span className="cuedup-legend-pct" style={{ color: r.color }}>{pct}%</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
