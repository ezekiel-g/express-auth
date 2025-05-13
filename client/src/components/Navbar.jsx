import { Link, useNavigate } from 'react-router-dom'
import useAuthContext from '../context/useAuthContext'

const Navbar = ({ backEndUrl }) => {
    const { user, setUser } = useAuthContext()
    const navigate = useNavigate()
    
    const handleSignOut = async () => {
        if (!window.confirm('Are you sure you want to sign out?')) return

        try {
            await fetch(`${backEndUrl}/api/v1/sessions`, {
                method: 'DELETE',
                credentials: 'include'
            })
        } catch (error) {
            console.error(`Error: ${error.message}`)
        }

        setUser(null)
        navigate('/', { state: { message: 'Signed out successfully' } })
    }

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
                    onClick={() => handleSignOut()}
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
