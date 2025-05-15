import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import useAuthContext from '../contexts/useAuthContext.js'
import validateUser from '../utilities/validateUser.js'
import fetchWithRefresh from '../utilities/fetchWithRefresh.js'
import messageUtility from '../utilities/messageUtility.jsx'

const SettingsPage = () => {
    const {
        user,
        setUser,
        canEditSettings,
        setCanEditSettings
    } = useAuthContext()
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [reEnteredPassword, setReEnteredPassword] = useState('')
    const [successMessages, setSuccessMessages] = useState([])
    const [errorMessages, setErrorMessages] = useState([])
    const shouldSubmit = useRef(false)
    const navigate = useNavigate()
    const location = useLocation()

    useEffect(() => {
        if (!user) {
            navigate('/sign-in')
        } else {
            setUsername(user.username)
            setEmail(user.email)
            setPassword('')
            setReEnteredPassword('')
        }

        if (!location.state?.fromConfirmationPage && canEditSettings) {
            setCanEditSettings(false)
        }

        setErrorMessages([])
    }, [user, navigate, location.state, canEditSettings, setCanEditSettings])

    const handleSubmit = async event => {
        event.preventDefault()
        setSuccessMessages([])
        setErrorMessages([])

        if (!shouldSubmit.current) return

        shouldSubmit.current = false

        const newErrors = []

        const usernameValid = validateUser.validateUsername(username)
        if (!usernameValid.valid) newErrors.push(usernameValid.message)

        const emailValid = validateUser.validateEmail(email)
        if (!emailValid.valid) newErrors.push(emailValid.message)

        if (password && password !== '') {
            const passwordValid = validateUser.validatePassword(password)
            if (!passwordValid.valid) newErrors.push(passwordValid.message)
        }

        if (password && password !== reEnteredPassword) {
            newErrors.push('Passwords must match')
        }

        if (newErrors.length > 0) {
            setErrorMessages(newErrors)
            return
        }

        const updatedUser = {}

        if (username !== user?.username) updatedUser.username = username
        if (email !== user?.email) updatedUser.email = email
        if (password && password !== '') {
            updatedUser.password = password
        }

        if (Object.keys(updatedUser).length === 0) {
            setErrorMessages(['No changes detected'])
            return
        }

        try {
            const response = await fetchWithRefresh(
                `/api/v1/users/${user.id}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedUser)
                }
            )
            const data = await response.json()

            if (!response.ok) {
                setErrorMessages([data.message || 'Update failed'])
                return
            } else {
                const newMessages = []

                if (updatedUser.username) {
                    newMessages.push('Username updated successfully')
                }
                if (updatedUser.email) {
                    newMessages.push('Email address updated successfully')
                }
                if (updatedUser.password) {
                    newMessages.push('Password updated successfully')
                }

                setUser(Object.assign({}, user, updatedUser))
                shouldSubmit.current = false
                setPassword('')
                setReEnteredPassword('')
                messageUtility.setSuccessMessagesTimeout(
                    newMessages,
                    setSuccessMessages
                )
            }
        } catch (error) {
            setErrorMessages(['Server connection error'])
            console.error(`Error: ${error.message}`)
        }

        setCanEditSettings(false)
    }

    const goToConfirmationPage = confirmationType => {
        navigate('/confirm', { state: { confirmationType: confirmationType } })
    }

    const handleCancel = () => {
        setUsername(user?.username)
        setEmail(user?.email)
        setPassword('')
        setReEnteredPassword('')
        setCanEditSettings(false)
        setErrorMessages([])
    }

    let passwordLabel = ''
    let passwordPlaceholder = ''
    let reEnteredPasswordDisplay = null
    let buttonDisplay = <></>
    let inputClasses = ''

    if (canEditSettings) {
        passwordLabel = 'New password'
        reEnteredPasswordDisplay =
            <div className="mb-3">
                <label
                    htmlFor="reEnteredPassword"
                    className="form-label"
                >
                    Re-enter new password
                </label>
                <input
                    type="password"
                    className="form-control rounded-0"
                    id="reEnteredPassword"
                    value={reEnteredPassword}
                    onChange={
                        event =>
                            setReEnteredPassword(event.target.value)
                    }
                    placeholder="Leave blank to keep password unchanged"
                />
            </div>            
        buttonDisplay =
            <div>
                <button 
                    type="submit"
                    className="btn btn-primary mb-3 rounded-0 me-2"
                    onClick={() => { shouldSubmit.current = true }}
                >
                    Submit
                </button>
                <button 
                    type="button"
                    className="btn btn-secondary mb-3 rounded-0"
                    onClick={handleCancel}
                >
                    Cancel
                </button>
            </div>
        inputClasses = 'form-control rounded-0'
        passwordPlaceholder = 'Leave blank to keep password unchanged'
    } else {
        passwordLabel = 'Password'
        buttonDisplay =
            <div>
                <button 
                    type="button"
                    className="btn btn-primary mb-3 rounded-0"
                    onClick={() => goToConfirmationPage('enterPassword')}
                >
                    Edit
                </button>
            </div>
        inputClasses =
            'form-control rounded-0 bg-secondary-subtle border-secondary'
        passwordPlaceholder = '****************'
    }

    const successMessageDisplay =
        messageUtility.displaySuccessMessages(successMessages)
    const errorMessageDisplay =
        messageUtility.displayErrorMessages(errorMessages)

    return (
        <div className="container mt-5 px-5">
            {successMessageDisplay}
            {errorMessageDisplay}
            <h2 className="mb-4">Settings</h2>
            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label htmlFor="username" className="form-label">
                        Username
                    </label>
                    <input
                        type="text"
                        className={inputClasses}
                        id="username"
                        value={username}
                        onChange={event => setUsername(event.target.value)}
                        disabled={!canEditSettings}
                    />
                </div>

                <div className="mb-3">
                    <label htmlFor="email" className="form-label">
                        Email address
                    </label>
                    <input
                        type="email"
                        className={inputClasses}
                        id="email"
                        value={email}
                        onChange={event => setEmail(event.target.value)}
                        disabled={!canEditSettings}
                    />
                </div>

                <div className="mb-3">
                    <label htmlFor="password" className="form-label">
                        {passwordLabel}
                    </label>
                    <input
                        type="password"
                        className={inputClasses}
                        id="password"
                        value={password}
                        onChange={event => setPassword(event.target.value)}
                        disabled={!canEditSettings}
                        placeholder={passwordPlaceholder}
                    />
                </div>
                {reEnteredPasswordDisplay}

                <br />
                {buttonDisplay}
            </form>
        </div>
    )
}

export default SettingsPage
