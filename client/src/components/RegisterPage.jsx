import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useAuthContext from '../contexts/auth/useAuthContext.js'
import fetchFromDatabase from '../utilities/fetchFromDatabase.js'
import validateUser from '../utilities/validateUser.js'
import messageUtility from '../utilities/messageUtility.jsx'

const RegisterPage = ({ backEndUrl }) => {
    const { user } = useAuthContext()
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmedPassword, setConfirmedPassword] = useState('')
    const [successMessages, setSuccessMessages] = useState([])
    const [errorMessages, setErrorMessages] = useState([])
    const navigate = useNavigate()
    const isRegistering = useRef(false)

    useEffect(() => {
        if (user && !isRegistering.current) navigate('/')
    }, [user, navigate])

    const handleSubmit = async event => {
        event.preventDefault()
        setErrorMessages([])

        const newErrors = []

        const usernameValid = await validateUser.validateUsername(username)
        if (!usernameValid.valid) newErrors.push(usernameValid.message)

        const emailValid = await validateUser.validateEmail(email)
        if (!emailValid.valid) newErrors.push(emailValid.message)

        const passwordValid = await validateUser.validatePassword(password)
        if (!passwordValid.valid) newErrors.push(passwordValid.message)

        if (password !== confirmedPassword) {
            newErrors.push('Passwords must match')
        }
        if (newErrors.length > 0) {
            setErrorMessages(newErrors)
            return
        }

        const data = await fetchFromDatabase(
            `${backEndUrl}/api/v1/users`,
            'POST',
            'application/json',
            'same-origin',
            { username, email, password }
        )
        
        if (!data || typeof data !== 'object') {
            setErrorMessages(['Registration failed'])
            return
        } else {
            isRegistering.current = true
            setSuccessMessages([
                data.message ||
                'Registered successfully — please sign in'
            ])
            setTimeout(() => { navigate('/sign-in') }, 2000)
        }
    }

    const successMessageDisplay =
        messageUtility.displaySuccessMessages(successMessages)
    const errorMessageDisplay =
        messageUtility.displayErrorMessages(errorMessages)

    return (
        <div className="container mt-5 px-5">
            {successMessageDisplay}
            {errorMessageDisplay}
            <h2 className="mb-4">Register</h2>
            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label htmlFor="username" className="form-label">
                        Username
                    </label>
                    <input
                        type="text"
                        className="form-control rounded-0"
                        id="username"
                        value={username}
                        onChange={event => setUsername(event.target.value)}
                    />
                </div>
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

                <div className="mb-3">
                    <label htmlFor="confirmedPassword" className="form-label">
                        Re-enter password
                    </label>
                    <input
                        type="password"
                        className="form-control rounded-0"
                        id="confirmedPassword"
                        value={confirmedPassword}
                        onChange={
                            event => setConfirmedPassword(event.target.value)
                        }
                    />
                </div>

                <br />
                <button 
                    type="submit"
                    className="btn btn-primary mb-3 rounded-0"
                >
                    Submit
                </button>
            </form>
            <Link className="nav-link ps-0" to="/sign-in">
                Have an account? Sign in
            </Link>
        </div>
    )
}

export default RegisterPage
