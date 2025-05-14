import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthContext from '../context/useAuthContext'
import validateUser from '../utilities/validateUser.js'
import fetchWithRefresh from '../utilities/fetchWithRefresh.js'

const SettingsPage = () => {
    const { user, setUser } = useAuthContext()
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmedPassword, setConfirmedPassword] = useState('')
    const [editing, setEditing] = useState(false)
    const [flashMessages, setFlashMessages] = useState([])
    const [errors, setErrors] = useState([])
    const shouldSubmit = useRef(false)
    const navigate = useNavigate()

    useEffect(() => {
        if (!user) {
            navigate('/sign-in')
        } else {
            setUsername(user.username)
            setEmail(user.email)
            setPassword('')
            setConfirmedPassword('')
        }
    }, [user, navigate])

    const handleSubmit = async event => {
        event.preventDefault()
        setFlashMessages([])
        setErrors([])

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

        if (password && password !== confirmedPassword) {
            newErrors.push('Passwords must match')
        }

        if (newErrors.length > 0) {
            setErrors(newErrors)
            return
        }

        const updatedUser = {}

        if (username !== user?.username) updatedUser.username = username
        if (email !== user?.email) updatedUser.email = email
        if (password && password !== '') {
            updatedUser.password = password
        }

        if (Object.keys(updatedUser).length === 0) {
            setErrors(['No changes detected'])
            return
        }

        try {
            if (!window.confirm('Are you sure you want to update?')) return

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
                setErrors([data.message || 'Update failed'])
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
                setConfirmedPassword('')
                setFlashMessagesTimeout(newMessages)
            }
        } catch (error) {
            setErrors(['Server connection error'])
            console.error(`Error: ${error.message}`)
        }

        setEditing(false)
    }

    const setFlashMessagesTimeout = messages => {
        setFlashMessages(messages)

        const timer = setTimeout(() => {
            setFlashMessages([])
        }, 3000)

        return () => clearTimeout(timer)
    }

    const handleCancel = () => {
        setUsername(user?.username)
        setEmail(user?.email)
        setPassword('')
        setConfirmedPassword('')
        setEditing(false)
        setErrors([])
    }

    let confirmedPasswordDisplay
    let buttonDisplay
    let inputClasses
    let passwordPlaceholder

    if (editing) {
        confirmedPasswordDisplay =
            <div className="mb-3">
                <label
                    htmlFor="confirmedPassword"
                    className="form-label"
                >
                    Password (confirm)
                </label>
                <input
                    type="password"
                    className="form-control rounded-0"
                    id="confirmedPassword"
                    value={confirmedPassword}
                    onChange={
                        event =>
                            setConfirmedPassword(event.target.value)
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
        buttonDisplay =
            <div>
                <button 
                    type="button"
                    className="btn btn-primary mb-3 rounded-0"
                    onClick={() => setEditing(true)}
                >
                    Edit
                </button>
            </div>
        inputClasses =
            'form-control rounded-0 bg-secondary-subtle border-secondary'
        passwordPlaceholder = '****************'
    }

    let flashMessageDisplay = <></>

    if (flashMessages) {
        flashMessageDisplay = flashMessages.map((message, index) => (
            <div className="alert alert-success rounded-0" key={index}>
                {message}
            </div>
        ))
    }

    let errorDisplay = <></>

    if (errors.length > 0) {
        errorDisplay = errors.map((error, index) => (
            <div className="alert alert-danger rounded-0" key={index}>
                {error}
            </div>
        ))
    }

    return (
        <div className="container mt-5 px-5">
            <h2 className="mb-4">Settings</h2>

            <form onSubmit={handleSubmit}>
                {flashMessageDisplay}
                {errorDisplay}
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
                        disabled={!editing}
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
                        disabled={!editing}
                    />
                </div>

                <div className="mb-3">
                    <label htmlFor="password" className="form-label">
                        Password
                    </label>
                    <input
                        type="password"
                        className={inputClasses}
                        id="password"
                        value={password}
                        onChange={event => setPassword(event.target.value)}
                        disabled={!editing}
                        placeholder={passwordPlaceholder}
                    />
                </div>
                {confirmedPasswordDisplay}

                <br />
                {buttonDisplay}
            </form>
        </div>
    )
}

export default SettingsPage
