import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthContext from '../context/useAuthContext'
import validateUser from '../utilities/validateUser.js'

const SettingsPage = () => {
    const { user } = useAuthContext()
    const navigate = useNavigate()

    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [editing, setEditing] = useState(false)
    const [errors, setErrors] = useState([])

    const handleSubmit = event => {
        event.preventDefault()
        setErrors([])

        const newErrors = []

        const usernameValid = validateUser.validateUsername(username)
        if (!usernameValid.valid) newErrors.push(usernameValid.message)

        const emailValid = validateUser.validateEmail(email)
        if (!emailValid.valid) newErrors.push(emailValid.message)

        const passwordValid = validateUser.validatePassword(password)
        if (!passwordValid.valid) newErrors.push(passwordValid.message)

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

        console.log(`${Object.keys(updatedUser).length} changes`)

        setEditing(false)
    }

    const handleCancel = () => {
        setUsername(user?.username)
        setEmail(user?.email)
        setPassword('')
        setEditing(false)
        setErrors([])
    }

    useEffect(() => {
        if (!user) {
            navigate('/sign-in')
        } else {
            setUsername(user.username)
            setEmail(user.email)
            setPassword('')
        }
    }, [user, navigate])

    let buttonDisplay
    let inputClasses
    let emailPlaceholder

    if (editing) {
        buttonDisplay =
            <div>
                <button 
                    type="submit"
                    className="btn btn-primary mb-3 rounded-0 me-2"
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
        emailPlaceholder = ''
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
        emailPlaceholder = '****************'
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
                        placeholder={emailPlaceholder}
                    />
                </div><br />

                {buttonDisplay}
            </form>
        </div>
    )
}

export default SettingsPage
