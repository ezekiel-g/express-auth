import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import useAuthContext from '../../contexts/auth/useAuthContext.js'
import fetchFromDatabase from '../../../util/fetchFromDatabase.js'
import validateUser from '../../../util/validateUser.js'
import messageUtility from '../../../util/messageUtility.jsx'

const SignInPage = ({ backEndUrl }) => {
    const { user, setUser } = useAuthContext()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [totpCode, setTotpCode] = useState('')
    const [totpRequired, setTotpRequired] = useState(false)
    const [userIdForTotp, setUserIdForTotp] = useState(null)
    const [successMessages, setSuccessMessages] = useState([])
    const [errorMessages, setErrorMessages] = useState([])
    const navigate = useNavigate()
    const location = useLocation()
    const isSigningIn = useRef(false)
    const hasConfirmedPasswordReset = useRef(false)

    const handleEmailPasswordSubmit = async event => {
        event.preventDefault()
        if (isSigningIn.current) return
        isSigningIn.current = true
        setSuccessMessages([])
        setErrorMessages([])

        const newErrors = []

        if (email.trim() === '') newErrors.push('Email address required')
        if (!password) newErrors.push('Password required')
        if (newErrors.length > 0) {
            isSigningIn.current = false
            setErrorMessages(newErrors)
            return
        }

        const data = await fetchFromDatabase(
            `${backEndUrl}/api/v1/sessions`,
            'POST',
            'application/json',
            'include',
            { email, password }
        )

        if (!data || typeof data !== 'object' || !data.message) {
            isSigningIn.current = false
            setSuccessMessages([])
            setErrorMessages(['Sign-in failed'])
            return
        }

        if (data.message === 'Signed in successfully') {
            isSigningIn.current = true
            setErrorMessages([])
            setSuccessMessages([data.message])    
            setUser(data.user)
            setTimeout(() => { navigate('/') }, 1000)
            return
        }

        if (data.userId) {
            isSigningIn.current = false
            setUserIdForTotp(data.userId)
            setTotpRequired(true)
            setSuccessMessages([])
            setErrorMessages([data.message])
            return
        }

        isSigningIn.current = false
        setSuccessMessages([])
        setErrorMessages([data.message])
    }

    const handleTotpSubmit = async event => {
        event.preventDefault()
        if (isSigningIn.current) return
        isSigningIn.current = true
        setSuccessMessages([])
        setErrorMessages([])

        if (!totpCode.trim()) {
            isSigningIn.current = false
            setErrorMessages(['TOTP code required'])
            return
        }

        if (totpCode.length < 6) {
            isSigningIn.current = false
            setErrorMessages(['TOTP code must be 6 digits'])
            return
        }

        const data = await fetchFromDatabase(
            `${backEndUrl}/api/v1/sessions/verify-totp`,
            'POST',
            'application/json',
            'include',
            { userId: userIdForTotp, totpCode }
        )

        if (!data || data.message !== 'Signed in successfully') {
            isSigningIn.current = false
            setSuccessMessages([])
            setErrorMessages([data?.message || 'Invalid TOTP code'])
            return
        }

        setUser(data.user)
        setTotpRequired(false)
        isSigningIn.current = true
        setErrorMessages([])
        setSuccessMessages([data.message])
        setTimeout(() => { navigate('/') }, 1000)
    }

    const handleResendVerification = async () => {
        const data = await fetchFromDatabase(
            `${backEndUrl}/api/v1/users/resend-verification-email`,
            'POST',
            'application/json',
            'same-origin',
            { email }
        )
        
        if (!data || typeof data !== 'object' || !data.message) {
            setSuccessMessages([])
            setErrorMessages(['Failed to resend verification email'])
            return
        }

        if (data.message.includes('If you entered an')) {
            setErrorMessages([])
            setSuccessMessages([data.message])
            return
        }

        setSuccessMessages([])
        setErrorMessages([data.message])
    }

    const handleSendPasswordReset = useCallback(async emailForPasswordReset => {
        const data = await fetchFromDatabase(
            `${backEndUrl}/api/v1/users/send-password-reset-email`,
            'POST',
            'application/json',
            'same-origin',
            { email: emailForPasswordReset }
        )

        if (!data || typeof data !== 'object' || !data.message) {
            setSuccessMessages([])
            setErrorMessages(['Failed to send password reset email'])
            return
        }

        if (data.message.includes('If the email address is associated')) {
            setErrorMessages([])
            setSuccessMessages([data.message])
            return
        }

        setSuccessMessages([])
        setErrorMessages([data.message])
    }, [backEndUrl])


    const goToConfirmationPage = async confirmationType => {
        const emailValid = await validateUser.validateEmail(
            email,
            null,
            'skipDuplicateCheck'
        )
        if (!emailValid.valid) {
            setSuccessMessages([])
            setErrorMessages([emailValid.message])
            return null
        }
        navigate('/confirm', { state: {
            confirmationType: confirmationType,
            email: email
        } })
    }

    useEffect(() => {
        if (user && !isSigningIn.current) {
            navigate('/')
            return
        }
        if (
            location.state?.confirmedPasswordReset &&
            location.state?.email &&
            !hasConfirmedPasswordReset.current
        ) {
            hasConfirmedPasswordReset.current = true
            handleSendPasswordReset(location.state?.email).finally(() => {
                navigate(location.pathname, { replace: true, state: {} })
            })
        }
    }, [user, navigate, location, handleSendPasswordReset])

    const handleSubmit =
        !totpRequired ? handleEmailPasswordSubmit : handleTotpSubmit

    let totpDisplay = null
    
    if (totpRequired && userIdForTotp) {
        totpDisplay =
            <div className="mb-3">
                <label htmlFor="totp-code" className="form-label">
                    TOTP code from authenticator app:
                </label>
                <input
                    type="text"
                    className="form-control text-center rounded-0 mb-3"
                    id="totp-code"
                    value={totpCode}
                    onChange={event => setTotpCode(event.target.value)}
                    maxLength="6"
                    placeholder="123456"
                    style={{ maxWidth: '200px' }}
                />
            </div>
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
                {totpDisplay}

                <br />
                <button
                    type="submit"
                    className="btn btn-primary mb-3 rounded-0"
                >
                    Sign In
                </button>
            </form>
            <span
                onClick={() => goToConfirmationPage(
                    'confirmPasswordReset',
                    { email }
                )}
                style={{ cursor: 'pointer' }}
            >
                Forgot password?
            </span>
            <Link to="/register" className="nav-link ps-0">
                No account? Register
            </Link>
        </div>
    )
}

export default SignInPage
