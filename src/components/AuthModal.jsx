'use client'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function AuthModal({ onClose }) {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const [view, setView]         = useState('signin') // 'signin' | 'signup' | 'success'
  const [email, setEmail]       = useState('')
  const [password, setPass]     = useState('')
  const [name, setName]         = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoad]      = useState(false)
  const [showPass, setShowPass] = useState(false)

  const switchView = (next) => {
    setView(next)
    setError('')
    setEmail('')
    setPass('')
    setName('')
    setShowPass(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoad(true)
    setError('')
    try {
      if (view === 'signin') {
        const { error } = await signIn(email, password)
        if (error) throw error
        onClose()
      } else {
        const { error } = await signUp(email, password, name)
        if (error) throw error
        setView('success')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoad(false)
    }
  }

  const CloseBtn = () => (
    <button className="auth-close" onClick={onClose} aria-label="Close">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>
  )

  // ── Success screen ─────────────────────────────
  if (view === 'success') {
    return (
      <div className="auth-backdrop" onClick={onClose}>
        <div className="auth-modal" onClick={e => e.stopPropagation()}>
          <CloseBtn />
          <div className="auth-success-screen">
            <div className="auth-success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h2 className="auth-success-title">Check your inbox</h2>
            <p className="auth-success-body">
              We sent a confirmation link to <strong>{email}</strong>.
              Click it to activate your account.
            </p>
            <button className="auth-submit" onClick={() => switchView('signin')}>
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Sign in / Sign up ──────────────────────────
  return (
    <div className="auth-backdrop" onClick={onClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <CloseBtn />

        {/* Logo */}
        <div className="auth-logo">
          <img src="/PopCorn.png" alt="CuedUp" />
          <span>Cued<span className="text-gradient">Up</span></span>
        </div>

        {/* Heading */}
        <div className="auth-heading">
          <h2 className="auth-title">
            {view === 'signin' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="auth-subtitle">
            {view === 'signin'
              ? 'Sign in to access your lists and ratings'
              : 'Start tracking movies and shows you love'}
          </p>
        </div>

        {/* Google — most prominent, comes first */}
        <button className="auth-google" onClick={signInWithGoogle} type="button">
          <svg viewBox="0 0 24 24" className="auth-google-icon">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="auth-divider"><span>or</span></div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          {view === 'signup' && (
            <div className="auth-field">
              <input
                type="text"
                id="auth-name"
                placeholder=" "
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoComplete="name"
              />
              <label htmlFor="auth-name">Full Name</label>
            </div>
          )}

          <div className="auth-field">
            <input
              type="email"
              id="auth-email"
              placeholder=" "
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <label htmlFor="auth-email">Email</label>
          </div>

          <div className="auth-field">
            <input
              type={showPass ? 'text' : 'password'}
              id="auth-password"
              className="auth-field__pass-input"
              placeholder=" "
              value={password}
              onChange={e => setPass(e.target.value)}
              required
              minLength={6}
              autoComplete={view === 'signin' ? 'current-password' : 'new-password'}
            />
            <label htmlFor="auth-password">Password</label>
            <button
              type="button"
              className="auth-pass-toggle"
              onClick={() => setShowPass(s => !s)}
              tabIndex={-1}
              aria-label={showPass ? 'Hide password' : 'Show password'}
            >
              {showPass ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading
              ? <span className="auth-spinner" />
              : view === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Switch */}
        <p className="auth-switch">
          {view === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => switchView(view === 'signin' ? 'signup' : 'signin')}>
            {view === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
