import { Link, useNavigate } from 'react-router-dom'
import useAuthContext from '../contexts/useAuthContext.js'

const Navbar = () => {
    const { user } = useAuthContext()
    const navigate = useNavigate()
    
    let linksRight

    if (user) {
        linksRight =
            <div>
                <Link
                    className="nav-link d-inline-block me-3"
                    to="/settings"
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
                className="nav-link d-inline-block me-3"
                to="/sign-in"
            >
                Sign In
            </Link>
            <Link className="nav-link d-inline-block" to="/register">
                Register
            </Link>
        </div>
    }

    return (
        <nav className="navbar px-2 py-3 border-bottom">
            <div className="container-fluid d-flex justify-content-between">
                <Link className="nav-link" to="/">Home</Link>
                {linksRight}
            </div>
        </nav>
    )
}

export default Navbar
