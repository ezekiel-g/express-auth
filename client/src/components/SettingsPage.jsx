import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import useAuthContext from '../contexts/auth/useAuthContext.js'
import fetchWithRefresh from '../utilities/fetchWithRefresh.js'
import validateUser from '../utilities/validateUser.js'
import messageUtility from '../utilities/messageUtility.jsx'

const SettingsPage = ({ backEndUrl }) => {
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
    const [pendingUserUpdate, setPendingUserUpdate] = useState({})
    const [successMessages, setSuccessMessages] = useState([])
    const [errorMessages, setErrorMessages] = useState([])
    const shouldSubmit = useRef(false)
    const hasSubmittedSecond = useRef(false)
    const navigate = useNavigate()
    const location = useLocation()

    const handleFirstSubmit = async event => {
        event.preventDefault()
        setSuccessMessages([])
        setErrorMessages([])

        if (!shouldSubmit.current) return

        shouldSubmit.current = false

        const newErrors = []

        const usernameValid =
            await validateUser.validateUsername(username, user.id)
        if (!usernameValid.valid) newErrors.push(usernameValid.message)

        const emailValid = await validateUser.validateEmail(email, user.id)
        if (!emailValid.valid) newErrors.push(emailValid.message)

        if (password && password !== '') {
            const passwordValid =
                await validateUser.validatePassword(password, user.id)
            if (!passwordValid.valid) newErrors.push(passwordValid.message)
        }
        if (
            (password && password !== reEnteredPassword) ||
            (!password && reEnteredPassword)
        ) {
            newErrors.push('Passwords must match')
        }
        if (newErrors.length > 0) {
            setErrorMessages(newErrors)
            return
        }

        const updatedUserDetails = {}

        if (username !== user?.username) updatedUserDetails.username = username
        if (email !== user?.email) updatedUserDetails.email = email
        if (password && password !== '') {
            updatedUserDetails.password = password
        }
        if (Object.keys(updatedUserDetails).length === 0) {
            setErrorMessages(['No changes detected'])
            return
        }
        
        setPendingUserUpdate(updatedUserDetails)
        navigate('/confirm', {
            state: {
                confirmationType: 'confirmUserUpdate',
                updatedUserDetails
            }
        })
    }

    const handleSecondSubmit = useCallback(async updated => {
        if (hasSubmittedSecond.current) return
        hasSubmittedSecond.current = true

        const updatedUser = Object.assign({}, user, updated)
        const data = await fetchWithRefresh(
            `${backEndUrl}/api/v1/users/${user.id}`,
            'PUT',
            'application/json',
            'include',
            updatedUser
        )
        console.log(data)
        if (!data || typeof data !== 'object') {
            setErrorMessages([data?.message || 'Update failed'])
            return
        } else {
            const newMessages = []

            if (data.user.username !== user.username) {
                newMessages.push('Username updated successfully')
            }
            if (data.message.includes('confirm email change')) {
                newMessages.push(
                    'Email address update pending email confirmation'
                )
            }
            if (updated.password) {
                newMessages.push('Password updated successfully')
            }

            updatedUser.email = user.email
            setUser(updatedUser)
            shouldSubmit.current = false
            setPassword('')
            setReEnteredPassword('')
            setSuccessMessages(newMessages)
        }

        setCanEditSettings(false)
        setPendingUserUpdate({})
        navigate(location.pathname, { replace: true })
    }, [
        user,
        setUser,
        setCanEditSettings,
        navigate,
        location.pathname,
        backEndUrl       
    ])

    useEffect(() => {
        if (!user) {
            navigate('/sign-in')
            return
        } else {
            setUsername(user.username)
            setEmail(user.email)
            setPassword('')
            setReEnteredPassword('')
        }
        
        if (!location.state?.confirmedPassword && canEditSettings) {
            setCanEditSettings(false)
        }

        if (location.state?.confirmedUserUpdate &&
            location.state?.updatedUserDetails
        ) {
            handleSecondSubmit(location.state?.updatedUserDetails)
        }

        setErrorMessages([])
    }, [
        user,
        navigate,
        location,
        canEditSettings,
        setCanEditSettings,
        pendingUserUpdate,
        handleSecondSubmit
    ])

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
            <form onSubmit={handleFirstSubmit}>
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
                        type="text"
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
