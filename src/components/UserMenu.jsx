'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import SettingsModal from './SettingsModal'

export default function UserMenu({ mobile = false }) {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [open, setOpen]               = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const ref = useRef(null)

  // Use 'click' not 'mousedown' so touch-taps on menu items work on mobile
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const avatar   = user?.user_metadata?.avatar_url
  const fullName = user?.user_metadata?.full_name || user?.email || ''
  const initials = fullName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  function go(path) { setOpen(false); router.push(path) }

  return (
    <div className={`user-menu${mobile ? ' user-menu--mobile' : ''}`} ref={ref}>
      <button className="user-avatar-btn" onClick={() => setOpen(o => !o)}>
        {avatar
          ? <img src={avatar} alt={fullName} className="user-avatar-img" />
          : <span className="user-avatar-initials">{initials}</span>
        }
      </button>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {open && (
        <div className="user-dropdown">
          {/* ── User info ── */}
          <div className="user-dropdown-header">
            <p className="user-dropdown-name">{fullName}</p>
            <p className="user-dropdown-email">{user?.email}</p>
          </div>

          <div className="user-dropdown-divider" />

          {/* ── Favourites ── */}
          <button className="user-dropdown-item" onClick={() => go('/favourites')}>
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ color: '#ef4444' }}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            My Favourites
          </button>

          {/* ── Reminders ── */}
          <button className="user-dropdown-item" onClick={() => go('/reminders')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#AB8BFF' }}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            My Reminders
          </button>

          <div className="user-dropdown-divider" />

          {/* ── Settings ── */}
          <button className="user-dropdown-item" onClick={() => { setOpen(false); setShowSettings(true) }}>
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
            </svg>
            Settings
          </button>

          {/* ── Sign out ── */}
          <button
            className="user-dropdown-item user-dropdown-item--danger"
            onClick={async () => { setOpen(false); await signOut() }}
          >
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h7a1 1 0 000-2H4V5h6a1 1 0 000-2H3zm11.293 4.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L15.586 11H9a1 1 0 010-2h6.586l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}
