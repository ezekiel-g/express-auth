import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import useAuthContext from '../context/useAuthContext'

const SignInPage = ({ backEndUrl }) => {
    const { user, setUser } = useAuthContext()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [errors, setErrors] = useState([])
    const [flashMessage, setFlashMessage] = useState('')
    const navigate = useNavigate()
    const location = useLocation()

    useEffect(() => {
        if (user) navigate('/')
    }, [user, navigate])

    useEffect(() => {
        if (location.state?.message) {
            setFlashMessage(location.state.message)

            const timer = setTimeout(() => {
                setFlashMessage('')
            }, 3000)

            return () => clearTimeout(timer)
        }
    }, [location.state])

    const handleSubmit = async event => {
        event.preventDefault()
        setErrors([])

        const newErrors = []

        if (email.trim() === '') newErrors.push('Email address required')
        if (!password) newErrors.push('Password required')

        if (newErrors.length > 0) {
            setErrors(newErrors)
            return
        }

        try {
            const response = await fetch(`${backEndUrl}/api/v1/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
                credentials: 'include'
            })
            const data = await response.json()

            if (!response.ok) {
                setErrors([data.message || 'Sign-in failed'])
                return
            }

            setUser(data.user)
            navigate('/', { state: { message: 'Signed in successfully' } })
        } catch (error) {
            setErrors(['Server connection error'])
            console.error(`Error: ${error.message}`)
        }
    }

    let flashMessageDisplay = <></>

    if (flashMessage) {
        flashMessageDisplay = 
            <div className="alert alert-success rounded-0">
                {flashMessage}
            </div>
    }

    let errorDisplay = <></>

    if (errors.length > 0) {
        errorDisplay = errors.map((error, index) => {
            return (
                <div className="alert alert-danger rounded-0" key={index}>
                    {error}
                </div>
            )
        })
    }

    return (
        <div className="container mt-5 px-5">
            <h2 className="mb-4">Sign In</h2>
            <form onSubmit={handleSubmit}>
                {flashMessageDisplay}
                {errorDisplay}
                <div className="mb-3">
                    <label htmlFor="email" className="form-label">
                        Email address
                    </label>
                    <input
                        type="text"
                        className="form-control rounded-0"
                        id="email"
                        value={email}
                        onChange={event => setEmail(event.target.value)}
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="password" className="form-label">
                        Password
                    </label>
                    <input
                        type="password"
                        className="form-control rounded-0"
                        id="password"
                        value={password}
                        onChange={event => setPassword(event.target.value)}
                    />
                </div>
                
                <br />
                <button 
                    type="submit"
                    className="btn btn-primary mb-3 rounded-0"
                >
                    Sign In
                </button>
            </form>
            <Link className="nav-link ps-0" to="/register">
                No account? Register
            </Link>
        </div>
    )
}

export default SignInPage
