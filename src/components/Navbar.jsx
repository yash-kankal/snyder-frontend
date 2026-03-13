import { Link } from 'react-router-dom'

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          Snyder<span className="text-gradient">Movies</span>
        </Link>
      </div>
    </nav>
  )
}

export default Navbar
