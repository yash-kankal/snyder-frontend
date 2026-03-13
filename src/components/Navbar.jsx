import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import SearchBar from './SearchBar'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const isOnBrowse = location.pathname === '/browse'
  const section = searchParams.get('section') || 'popular'
  const hasQuery = !!searchParams.get('q')

  const isActive = (s) => isOnBrowse && section === s && !hasQuery

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          Snyder<span className="text-gradient">Movies</span>
        </Link>

        <div className="nav-links">
          <button
            onClick={() => navigate('/browse?section=trending')}
            className={`nav-link${isActive('trending') ? ' active' : ''}`}
          >
            Trending
          </button>
          <button
            onClick={() => navigate('/browse?section=new')}
            className={`nav-link${isActive('new') ? ' active' : ''}`}
          >
            New Releases
          </button>
        </div>

        <SearchBar />
      </div>
    </nav>
  )
}
