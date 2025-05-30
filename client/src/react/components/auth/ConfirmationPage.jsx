import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import bcryptjs from 'bcryptjs'
import useAuthContext from '../../contexts/auth/useAuthContext.js'
import fetchWithRefresh from '../../../util/fetchWithRefresh.js'
import messageUtility from '../../../util/messageUtility.jsx'

const ConfirmationPage = ({ backEndUrl }) => {
    const { user, setUser, setCanEditSettings } = useAuthContext()
    const [password, setPassword] = useState('')
    const [successMessages, setSuccessMessages] = useState([])
    const [errorMessages, setErrorMessages] = useState([])
    const navigate = useNavigate()
    const location = useLocation()
    const isSigningOut = useRef(false)
    const confirmationType = location.state?.confirmationType
    
    useEffect(() => {
        if (!confirmationType) {
            navigate('/')
            return
        }
        const requiresUser = [
            'enterPassword',
            'confirmUserUpdate',
            'signOut',
            'turnOffTwoFactor',
            'confirmDeleteAccount'
        ]
        if (
            requiresUser.includes(confirmationType) &&
            !user && !isSigningOut.current
        ) {
            navigate('/')
        }
    }, [confirmationType, user, navigate])

    let question = ''
    let contentDisplay = null
    let submitButtonName = 'Confirm'
    let confirmFunction = () => {}
    let cancelFunction = () => {}

    if (confirmationType === 'enterPassword') {
        question = 'Enter password to continue'
        contentDisplay =
            <div className="mb-3">
                <input
                    type="password"
                    className="form-control rounded-0"
                    id="password"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                />
            </div>
        submitButtonName = 'Submit'

        confirmFunction = async () => {
            if (!password) {
                setErrorMessages(['Password required'])
                return
            }

            const data = await fetchWithRefresh(
                `${backEndUrl}/api/v1/users/${user.id}`,
                'GET',
                'application/json',
                'include'
            )
            if (
                !data ||
                typeof data !== 'object' ||
                typeof data.password !== 'string'
            ) {
                setErrorMessages([data?.message || 'Fetch error'])
                return
            }
            const isPasswordValid =
                await bcryptjs.compare(password, data.password)
            if (!isPasswordValid) {
                setErrorMessages(['Invalid password'])
                return
            }
            setErrorMessages([])
            setCanEditSettings(true)
            navigate('/settings', { state: { confirmedPassword: true } })
        }

        cancelFunction = () => navigate('/settings')
    } else if (confirmationType === 'confirmUserUpdate') {
        question = 'Update the following?'
        const updatedUserDetails = location.state?.updatedUserDetails || {}
        contentDisplay = Object.keys(updatedUserDetails).map((field, index) => {
            let label = ''
            if (field === 'email') {
                label = 'Email address'
            } else if (field === 'password') {
                label = 'Password'
            } else if (field === 'username') {
                label = 'Username'
            } else {
                label = field
            }

            return <div key={index} className="mb-1">{label}</div>
        })
        contentDisplay = <div>{contentDisplay}<br /></div>

        confirmFunction = () => {
            navigate('/settings', {
                state: {
                    confirmedUserUpdate: true,
                    updatedUserDetails
                }
            })
        }

        cancelFunction = () => navigate(-1)
    } else if (confirmationType === 'signOut') {
        question = 'Sign out?'

        confirmFunction = async () => {
            const data = await fetchWithRefresh(
                `${backEndUrl}/api/v1/sessions`,
                'DELETE',
                'application/json',
                'include'
            )
            setUser(null)
            isSigningOut.current = true
            setSuccessMessages([data.message || 'Signed out successfully'])
            setTimeout(() => { navigate('/sign-in') }, 1000)
        }

        cancelFunction = () => navigate('/')
    } else if (confirmationType === 'confirmPasswordReset') {
        question = `Send password reset link to ${location.state?.email}?`

        confirmFunction = () => {
            navigate('/sign-in', { state: {
                confirmedPasswordReset: true,
                email: location.state?.email
            } })
        }

        cancelFunction = () => navigate('/sign-in')
    } else if (confirmationType === 'turnOffTwoFactor') {
        question = 'Remove two-factor authentication?'
        contentDisplay =
            <p>
                This will erase your current 2FA setup, and you will need to
                scan a new QR code to set up 2FA again
            </p>

        confirmFunction = () => {
            navigate('/settings/two-factor-authentication', {
                replace: true,
                state: { confirmedTwoFactorOff: true }
            })
        }    

        cancelFunction = () => navigate(-1)
    } else if (confirmationType === 'confirmDeleteAccount') {
        question = 'Continue with account deletion (irreversible)?'
        submitButtonName = 'Continue'
        confirmFunction = () => {
            navigate('/settings', {
                replace: true,
                state: { deleteAccountConfirmed: true }
            })
        }

        cancelFunction = () => navigate(-1)
    }

    const successMessageDisplay =
        messageUtility.displaySuccessMessages(successMessages)
    const errorMessageDisplay =
        messageUtility.displayErrorMessages(errorMessages)

    return (
        <div className="container mt-5 px-5">
            {successMessageDisplay}
            {errorMessageDisplay}
            <h3 className="mb-4">{question}</h3>
            {contentDisplay}
            <div>
                <button
                    type="submit"
                    className="btn btn-primary mb-3 rounded-0 me-2"
                    onClick={() => confirmFunction()}
                >
                    {submitButtonName}
                </button>
                <button
                    type="button"
                    className="btn btn-secondary mb-3 rounded-0"
                    onClick={() => cancelFunction()}
                >
                    Cancel
                </button>
            </div>
        </div>
    )
}

export default ConfirmationPage
