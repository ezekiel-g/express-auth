import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import useAuthContext from '../../contexts/auth/useAuthContext.js'
import validateUser from '../../../util/validateUser.js'
import fetchWithRefresh from '../../../util/fetchWithRefresh.js'
import messageUtility from '../../../util/messageUtility.jsx'

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
    const [twoFactorStatus, setTwoFactorStatus] = useState('OFF')
    const [successMessages, setSuccessMessages] = useState([])
    const [errorMessages, setErrorMessages] = useState([])
    const shouldSubmit = useRef(false)
    const hasSubmittedSecond = useRef(false)
    const hasConfirmedDeletion = useRef(false)
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
        
        // const data = await fetchWithRefresh(
        //     `${backEndUrl}/api/v1/verifications/validate-user-info-update`,
        //     'POST',
        //     'application/json',
        //     'include',
        //     { id: user.id, username, email, password, reEnteredPassword }
        // )
        
        // if (!data || typeof data !== 'object' || !data.message) {
        //     setErrorMessages(['User info check failed'])
        //     return
        // }

        // if (data.validationErrors?.length > 0) {
        //     setErrorMessages(data.validationErrors)
        //     return
        // }

        // if (data.message === 'Input validation passed') {
        //     const updatedUserDetails = {}

        //     if (username !== user.username) {
        //         updatedUserDetails.username = username
        //     }
        //     if (email !== user.email) updatedUserDetails.email = email
        //     if (password) updatedUserDetails.password = password

        //     setPendingUserUpdate(updatedUserDetails)
        //     navigate('/confirm', {
        //         state: {
        //             confirmationType: 'confirmUserUpdate',
        //             updatedUserDetails
        //         }
        //     })
        //     return
        // }

        // setErrorMessages([data.message])
    }
    
    const handleSecondSubmit = useCallback(async updated => {
        if (hasSubmittedSecond.current) return
        hasSubmittedSecond.current = true

        const updatedUser = Object.assign({}, user, updated)
        
        const data = await fetchWithRefresh(
            `${backEndUrl}/api/v1/users/${user.id}`,
            'PATCH',
            'application/json',
            'include',
            updatedUser
        )
        
        if (!data || typeof data !== 'object' || !data.message) {
            setErrorMessages(['Update failed'])
            return
        }

        if (data.validationErrors?.length > 0) {
            setErrorMessages(data.validationErrors)
            return
        }

        if (data.successfulUpdates?.length > 0) {
            updatedUser.email = user.email
            setUser(updatedUser)
            shouldSubmit.current = false
            setPassword('')
            setReEnteredPassword('')
            setCanEditSettings(false)
            setPendingUserUpdate({})
            setSuccessMessages(data.successfulUpdates)
            navigate(location.pathname, { replace: true })
            return
        }

        if (data.message.includes('User updated successfully')) {
            setSuccessMessages([data.message])
            return
        }

        setErrorMessages([data.message])
    }, [
        user,
        setUser,
        setCanEditSettings,
        navigate,
        location.pathname,
        backEndUrl       
    ])

    const handleSendDeleteAccountEmail = useCallback(async () => {
        setSuccessMessages([])
        setErrorMessages([])

        if (hasConfirmedDeletion.current) return
        hasConfirmedDeletion.current = true

        const data = await fetchWithRefresh(
            `${backEndUrl}/api/v1/verifications/request-account-deletion`,
            'POST',
            'application/json',
            'include',
            { id: user.id }
        )
        
        if (!data || typeof data !== 'object' || !data.message) {
            setErrorMessages(['Account deletion request failed'])
            return
        }

        if (data.message.includes('Account deletion requested')) {
            setSuccessMessages([data.message])
        }

        setErrorMessages['Account deletion request failed']
    }, [user, backEndUrl])

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

    useEffect(() => {
        if (!user) {
            navigate('/sign-in')
            return
        } else {
            setUsername(user.username)
            setEmail(user.email)
            setTwoFactorStatus(user.totp_auth_on === 0 ? 'OFF' : 'ON')
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

        if (location.state?.deleteAccountConfirmed) {
            handleSendDeleteAccountEmail(location.state?.deleteAccountConfirmed)
        }

        setErrorMessages([])
    }, [
        user,
        navigate,
        location,
        canEditSettings,
        setCanEditSettings,
        pendingUserUpdate,
        handleSecondSubmit,
        handleSendDeleteAccountEmail
    ])

    const passwordLabel = !canEditSettings ? 'Password' : 'New password'
    let passwordPlaceholder = '****************'
    let reEnteredPasswordDisplay = null
    let twoFactorLink = null
    let buttonDisplay = <></>
    let inputClasses = 'form-control rounded-0'
    let deleteAccountDiv =
        <div style={{ float: 'right' }}
        >
            Account status: ACTIVE
        </div>

    if (!canEditSettings) {
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
    } else {
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
        twoFactorLink =
            <span
                onClick={() => navigate('/settings/two-factor-authentication')}
                style={{ cursor: 'pointer', textDecoration: 'underline'}}
            >
                Update 2FA
            </span>  

        deleteAccountDiv =
            <span
                onClick={() => goToConfirmationPage('confirmDeleteAccount')}
                style={{
                    float: 'right',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                }}
            >
                Delete account
            </span>            
        passwordPlaceholder = 'Leave blank to keep password unchanged'
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
                
                {deleteAccountDiv}
                Two-factor authentication: {twoFactorStatus}<br />
                {twoFactorLink}
                <br /><br />
                {buttonDisplay}
            </form>
        </div>
    )
}

export default SettingsPage
