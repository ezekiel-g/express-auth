import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useAuthContext from '../contexts/auth/useAuthContext.js'
import fetchFromDatabase from '../utilities/fetchFromDatabase.js'
import messageUtility from '../utilities/messageUtility.jsx'

const SignInPage = ({ backEndUrl }) => {
    const { user, setUser } = useAuthContext()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [successMessages, setSuccessMessages] = useState([])
    const [errorMessages, setErrorMessages] = useState([])
    const navigate = useNavigate()
    const isSigningIn = useRef(false)

    useEffect(() => {
        if (user && !isSigningIn.current) navigate('/')
    }, [user, navigate])

    const handleSubmit = async event => {
        event.preventDefault()
        if (isSigningIn.current) return
        isSigningIn.current = true
        setErrorMessages([])

        const newErrors = []

        if (email.trim() === '') newErrors.push('Email address required')
        if (!password) newErrors.push('Password required')
        if (newErrors.length > 0) {
            setErrorMessages(newErrors)
            isSigningIn.current = false
            return
        }

        const data = await fetchFromDatabase(
            `${backEndUrl}/api/v1/sessions`,
            'POST',
            'application/json',
            'include',
            { email, password }
        )

        if (!data || typeof data !== 'object' || !data.user) {
            isSigningIn.current = false
            setSuccessMessages([])
            setErrorMessages([ data?.message || 'Sign-in failed'])
            return
        } else {
            setUser(data.user)
            isSigningIn.current = true
            setErrorMessages([])
            setSuccessMessages([data.message || 'Signed in successfully'])
            setTimeout(() => { navigate('/') }, 1000)
        }
    }

    const handleResendVerification = async () => {
        const data = await fetchFromDatabase(
            `${backEndUrl}/api/v1/users/resend-verification-email`,
            'POST',
            'application/json',
            'same-origin',
            { email }
        )
        
        if (data && data.message) {
            if (data.message.includes('If you entered an')) {
                setErrorMessages([])
                setSuccessMessages([data.message])
            } else {
                setSuccessMessages([])
                setErrorMessages([data.message])
            }
        } else {
            setSuccessMessages([])
            setErrorMessages(['Failed to resend verification email'])
        }
    }

    const successMessageDisplay =
        messageUtility.displaySuccessMessages(successMessages)

    let errorMessageDisplay
    if (errorMessages.includes(
        'Please verify your email address before signing in'
    )) {
        const resolutionLink =
            <span
                onClick={handleResendVerification}
                className={`
                    bg-transparent
                    text-primary
                    text-decoration-underline
                `}
                style={{ cursor: 'pointer' }}
            >
                Resend verification email
            </span>
        errorMessageDisplay = messageUtility.displayErrorMessages(
            errorMessages,
            resolutionLink
        )
    } else {
        errorMessageDisplay = messageUtility.displayErrorMessages(errorMessages)
    }

    return (
        <div className="container mt-5 px-5">
            {successMessageDisplay}
            {errorMessageDisplay}
            <h2 className="mb-4">Sign In</h2>
            <form onSubmit={handleSubmit}>
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
