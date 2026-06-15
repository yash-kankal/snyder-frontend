'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import SearchBar from './SearchBar'
import AuthModal from './AuthModal'
import UserMenu from './UserMenu'
import PlaylistsModal from './PlaylistsModal'
import MoodPicker from './MoodPicker'
import { useAuth } from '../contexts/AuthContext'

// Jump to top through Lenis when it's active so it doesn't fight the smooth
// scroller; fall back to the native instant jump otherwise.
const scrollTop = () => {
  if (typeof window === 'undefined') return
  if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true })
  else scrollTop()
}

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const [showAuth, setShowAuth]                 = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [showPlaylists, setShowPlaylists]       = useState(false)
  const [showMood, setShowMood]                 = useState(false)
  const [mounted, setMounted]                   = useState(false)
  const [scrolled, setScrolled]                 = useState(false)
  const searchBarRef                            = useRef(null)

  const isOnBrowse    = pathname === '/browse'
  const isOnStreaming = pathname === '/streaming'
  const section       = searchParams.get('section') || 'movies'
  const hasQuery      = !!searchParams.get('q')
  // Active on the browse section itself, and on matching detail pages so
  // visitors stay oriented while deep in a movie / show.
  const isActive      = (s) =>
    (isOnBrowse && section === s && !hasQuery) ||
    (s === 'movies' && pathname.startsWith('/movie/')) ||
    (s === 'tv'     && pathname.startsWith('/tv/'))

  const [lastSection, setLastSection] = useState(() =>
    typeof window !== 'undefined' ? (localStorage.getItem('lastSection') || 'movies') : 'movies'
  )

  useEffect(() => {
    if (isOnBrowse && (section === 'movies' || section === 'tv' || section === 'anime')) {
      localStorage.setItem('lastSection', section)
      setLastSection(section)
    }
  }, [isOnBrowse, section])

  const logoHref = `/browse?section=${lastSection}`

  // Focus the search input when the mobile overlay opens
  // setTimeout is the standard iOS workaround for programmatic focus
  useEffect(() => {
    if (mobileSearchOpen) {
      const t = setTimeout(() => searchBarRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [mobileSearchOpen])

  // Close mobile search on route change
  useEffect(() => { setMobileSearchOpen(false) }, [pathname])

  // Gate auth-dependent rendering to avoid SSR/client hydration mismatch
  useEffect(() => { setMounted(true) }, [])

  // Condense the navbar once the page is scrolled past the top
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <nav className={`navbar${scrolled ? ' navbar--scrolled' : ''}`}>
        <div className="navbar-inner">

          {/* ── Desktop layout ── */}
          <button className="navbar-brand" onClick={() => { router.push(logoHref); scrollTop() }}>
            <img src="/PopCorn.png" alt="CuedUp logo" className="navbar-logo-img" />
            <span>Cued<span className="text-gradient">Up</span></span>
          </button>

          <div className="nav-links">
            <button onClick={() => { router.push('/browse?section=movies'); scrollTop() }} className={`nav-link${isActive('movies') ? ' active' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="nav-link-icon">
                <path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z"/>
                <path d="m6.2 5.3 3.1 3.9"/>
                <path d="m12.4 3.4 3.1 3.9"/>
                <path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>
              </svg>
              Movies
            </button>
            <button onClick={() => { router.push('/browse?section=tv'); scrollTop() }} className={`nav-link${isActive('tv') ? ' active' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="nav-link-icon">
                <rect x="2" y="7" width="20" height="15" rx="2"/>
                <polyline points="17 2 12 7 7 2"/>
              </svg>
              TV Shows
            </button>
            <button onClick={() => { router.push('/browse?section=anime'); scrollTop() }} className={`nav-link${isActive('anime') ? ' active' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="nav-link-icon">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
              </svg>
              Anime
            </button>
            <button onClick={() => { router.push('/streaming'); scrollTop() }} className={`nav-link${isOnStreaming ? ' active' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="nav-link-icon">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <path d="M8 21h8M12 17v4"/>
                <polygon points="9.5,7.5 9.5,13.5 15.5,10.5" fill="currentColor" stroke="none"/>
              </svg>
              Streaming
            </button>
          </div>

          <div className="navbar-desktop-search">
            <SearchBar />
          </div>

          {mounted && user && (
            <div className="navbar-playlist-actions">
              <button className="nav-lists-btn" onClick={() => setShowPlaylists(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="15" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="12" y2="18"/>
                  <line x1="18" y1="15" x2="18" y2="21"/><line x1="15" y1="18" x2="21" y2="18"/>
                </svg>
                My Playlists
              </button>
            </div>
          )}

          <div className="navbar-auth">
            {mounted && !loading && (user ? <UserMenu /> : (
              <button className="nav-signin-btn" onClick={() => setShowAuth(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-signin-icon">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                Sign In
              </button>
            ))}
          </div>

          {/* ── Mobile left slot: playlist (keeps logo centred) ── */}
          <div className="navbar-mob-left">
            {mounted && user && (
              <button className="navbar-mob-icon-btn" onClick={() => setShowPlaylists(true)} aria-label="My Playlists">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="15" y2="6"/>
                  <line x1="3" y1="12" x2="15" y2="12"/>
                  <line x1="3" y1="18" x2="12" y2="18"/>
                  <line x1="18" y1="15" x2="18" y2="21"/>
                  <line x1="15" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
            )}
          </div>

          {/* ── Mobile right slot: search icon ── */}
          <div className="navbar-mob-right">
            <button className="navbar-mob-icon-btn" onClick={() => setMobileSearchOpen(true)} aria-label="Search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
          </div>

        </div>
      </nav>

      {/* ── Mobile search — full-screen page overlay, outside <nav> to avoid stacking context issues ── */}
      {mobileSearchOpen && (
        <div className="mob-search-page">
          <div className="mob-search-header">
            <button className="mobile-search-back" onClick={() => setMobileSearchOpen(false)} aria-label="Close search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
            <SearchBar ref={searchBarRef} />
          </div>
        </div>
      )}

      {/* ── Mobile bottom tab bar ── */}
      <nav className="mobile-bottom-nav">
        <button className={`mobile-tab${isActive('movies') ? ' mobile-tab--active' : ''}`} onClick={() => { router.push('/browse?section=movies'); scrollTop() }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mobile-tab-icon">
            <rect x="1" y="5" width="15" height="14" rx="2"/>
            <polygon points="23 7 16 12 23 17 23 7"/>
          </svg>
          <span>Movies</span>
        </button>
        <button className={`mobile-tab${isActive('tv') ? ' mobile-tab--active' : ''}`} onClick={() => { router.push('/browse?section=tv'); scrollTop() }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mobile-tab-icon">
            <rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/>
          </svg>
          <span>TV</span>
        </button>
        <button className={`mobile-tab${isActive('anime') ? ' mobile-tab--active' : ''}`} onClick={() => { router.push('/browse?section=anime'); scrollTop() }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mobile-tab-icon">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
          </svg>
          <span>Anime</span>
        </button>
        <button className={`mobile-tab${isOnStreaming ? ' mobile-tab--active' : ''}`} onClick={() => { router.push('/streaming'); scrollTop() }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mobile-tab-icon">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <path d="M8 21h8M12 17v4"/>
            <polygon points="9.5,7.5 9.5,13.5 15.5,10.5" fill="currentColor" stroke="none"/>
          </svg>
          <span>Stream</span>
        </button>
        <button className="mobile-tab" onClick={() => setShowMood(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mobile-tab-icon">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <span>MoodAI</span>
        </button>
        {/* Icon-only account tab — keeps six tabs comfortable on narrow screens.
            When signed in, UserMenu renders its own <button>, so it must NOT be
            nested inside another <button> (invalid HTML / hydration error). */}
        {mounted && user ? (
          <div className="mobile-tab mobile-tab--account">
            <UserMenu mobile />
          </div>
        ) : (
          <button className="mobile-tab mobile-tab--account" onClick={() => setShowAuth(true)} aria-label="Sign in">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mobile-tab-icon mobile-tab-icon--account">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </button>
        )}
      </nav>

      {/* ── MoodAI — floating button, bottom-right (desktop) ── */}
      <button className="mood-fab" onClick={() => setShowMood(true)} aria-label="MoodAI">
        <svg viewBox="0 0 20 20" fill="currentColor" className="mood-fab-icon">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
        MoodAI
      </button>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {showPlaylists && <PlaylistsModal onClose={() => setShowPlaylists(false)} />}
      {showMood && <MoodPicker onClose={() => setShowMood(false)} />}
    </>
  )
}
