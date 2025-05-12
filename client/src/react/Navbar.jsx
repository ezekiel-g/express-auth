import { Link, useNavigate } from 'react-router-dom'

function Navbar() {


    return (
        <nav className="navbar px-2 py-3 border-bottom">
            <div className="container-fluid d-flex justify-content-between">
                <Link className="nav-link" to="/">Home</Link>
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
            </div>
        </nav>
    )
}

export default Navbar
