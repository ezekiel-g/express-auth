import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import useAuthContext from '../../contexts/auth/useAuthContext.js'
import fetchFromDatabase from '../../../util/fetchFromDatabase.js'
import messageUtility from '../../../util/messageUtility.jsx'

const SignInPage = ({ backEndUrl }) => {
    const { user, setUser } = useAuthContext()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [hCaptchaToken, setHCaptchaToken] = useState(null)
    const [captchaVisible, setCaptchaVisible] = useState(false)
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
        if (!hCaptchaToken) {
            setCaptchaVisible(true)
            isSigningIn.current = false
            return
        }

        const data = await fetchFromDatabase(
            `${backEndUrl}/api/v1/sessions`,
            'POST',
            'application/json',
            'include',
            { email, password, hCaptchaToken }
        )

        if (!data || typeof data !== 'object' || !data.message) {
            isSigningIn.current = false
            setHCaptchaToken(null)
            setErrorMessages(['Sign-in failed'])
            return
        }

        if (data.message === 'Signed in successfully') {
            isSigningIn.current = true
            setSuccessMessages([data.message])    
            setUser(data.user)
            setTimeout(() => { navigate('/') }, 1000)
            return
        }

        if (data.userId) {
            isSigningIn.current = false
            setUserIdForTotp(data.userId)
            setTotpRequired(true)
            setErrorMessages([data.message])
            return
        }

        isSigningIn.current = false
        setHCaptchaToken(null)
        setErrorMessages([data.message])
    }

    const handleCaptchaResponse = token => {
        setHCaptchaToken(token)
        setCaptchaVisible(false)
    }

    const handleTotpSubmit = async event => {
        event.preventDefault()
        if (isSigningIn.current) return
        isSigningIn.current = true
        setSuccessMessages([])
        setErrorMessages([])

        if (!totpCode.trim()) {
            isSigningIn.current = false
            setErrorMessages(['6-digit TOTP required'])
            return
        }

        if (totpCode.length < 6) {
            isSigningIn.current = false
            setErrorMessages(['TOTP must be 6 digits'])
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
            setErrorMessages([data?.message || 'Invalid TOTP'])
            return
        }

        setUser(data.user)
        setTotpRequired(false)
        isSigningIn.current = true
        setSuccessMessages([data.message])
        setTimeout(() => { navigate('/') }, 1000)
    }

    const handleResendVerification = async () => {
        setSuccessMessages([])
        setErrorMessages([])

        const data = await fetchFromDatabase(
            `${backEndUrl}/api/v1/verifications/resend-verification-email`,
            'POST',
            'application/json',
            'same-origin',
            { email }
        )
        
        if (!data || typeof data !== 'object' || !data.message) {
            setErrorMessages(['Failed to resend verification email'])
            return
        }

        if (data.message.includes('If you entered an')) {
            setSuccessMessages([data.message])
            return
        }

        setErrorMessages([data.message])
    }

    const handleSendPasswordReset = useCallback(async emailForPasswordReset => {
        setSuccessMessages([])
        setErrorMessages([])
        
        const data = await fetchFromDatabase(
            `${backEndUrl}/api/v1/verifications/send-password-reset-email`,
            'POST',
            'application/json',
            'same-origin',
            { email: emailForPasswordReset }
        )

        if (!data || typeof data !== 'object' || !data.message) {
            setErrorMessages(['Failed to send password reset email'])
            return
        }

        if (data.message.includes('If the email address is associated')) {
            setSuccessMessages([data.message])
            return
        }

        setErrorMessages([data.message])
    }, [backEndUrl])


    const goToConfirmationPage = async confirmationType => {
        setSuccessMessages([])
        setErrorMessages([])

        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
        const emailFormatValid = emailRegex.test(email)

        if (!email) {
            setErrorMessages(['Email address required'])
            return null            
        }

        if (!emailFormatValid) {
            setErrorMessages(['Invalid email address format'])
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

    let captchaDisplay = null
    let totpDisplay = null

    if (captchaVisible) {
        captchaDisplay =
            <div className="hcaptcha-outer-container">
                <div className="hcaptcha-inner-container">
                    <HCaptcha
                        sitekey="b2e681ea-a462-46d0-a966-218053c0d5cc"
                        onVerify={handleCaptchaResponse}
                    />
                </div>         
            </div>
    }
    
    if (totpRequired && userIdForTotp) {
        totpDisplay =
            <div className="mb-3">
                <label htmlFor="totp-code" className="form-label">
                    6-digit TOTP from authenticator app:
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
                {captchaDisplay}
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
