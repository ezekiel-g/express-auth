import { useNavigate, Link } from 'react-router-dom'
import useAuthContext from '../contexts/auth/useAuthContext.js'

const Navbar = () => {
    const { user } = useAuthContext()
    const navigate = useNavigate()
    
    let linksRight

    if (user) {
        linksRight =
            <div>
                <Link
                    to="/settings"
                    className="nav-link d-inline-block me-3"
                >
                    Settings
                </Link>
                <span
                    className="nav-link d-inline-block"
                    role="button"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(
                        '/confirm',
                        { state: { confirmationType: 'signOut' } }
                    )}
                >
                    Sign Out
                </span>
            </div>
    } else {
        linksRight =
        <div>
            <Link
                to="/sign-in"
                className="nav-link d-inline-block me-3"
            >
                Sign In
            </Link>
            <Link to="/register" className="nav-link d-inline-block">
                Register
            </Link>
        </div>
    }

    return (
        <nav className="navbar px-2 py-3 border-bottom">
            <div className="container-fluid d-flex justify-content-between">
                <Link to="/" className="nav-link">Home</Link>
                {linksRight}
            </div>
        </nav>
    )
}

export default Navbar
