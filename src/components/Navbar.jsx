import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import SearchBar from './SearchBar'

export default function Navbar() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const section = searchParams.get('section') || 'popular'
  const hasQuery = !!searchParams.get('q')

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Brand */}
        <Link to="/" className="navbar-brand">
          Snyder<span className="text-gradient">Movies</span>
        </Link>

        {/* Section links */}
        <div className="nav-links">
          <button
            onClick={() => navigate('/?section=trending')}
            className={`nav-link${section === 'trending' && !hasQuery ? ' active' : ''}`}
          >
            Trending
          </button>
          <button
            onClick={() => navigate('/?section=new')}
            className={`nav-link${section === 'new' && !hasQuery ? ' active' : ''}`}
          >
            New Releases
          </button>
        </div>

        {/* Search */}
        <SearchBar />
      </div>
    </nav>
  )
}
