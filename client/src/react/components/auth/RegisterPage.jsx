import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useAuthContext from '../../contexts/auth/useAuthContext.js'
import fetchFromDatabase from '../../../util/fetchFromDatabase.js'
import messageUtility from '../../../util/messageUtility.jsx'

const RegisterPage = ({ backEndUrl }) => {
    const { user } = useAuthContext()
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [reEnteredPassword, setReEnteredPassword] = useState('')
    const [successMessages, setSuccessMessages] = useState([])
    const [errorMessages, setErrorMessages] = useState([])
    const navigate = useNavigate()
    const isRegistering = useRef(false)

    useEffect(() => {
        if (user && !isRegistering.current) navigate('/')
    }, [user, navigate])

    const handleSubmit = async event => {
        event.preventDefault()
        setSuccessMessages([])
        setErrorMessages([])

        const data = await fetchFromDatabase(
            `${backEndUrl}/api/v1/users`,
            'POST',
            'application/json',
            'same-origin',
            { username, email, password, reEnteredPassword }
        )
        
        if (!data || typeof data !== 'object' || !data.message) {
            setErrorMessages(['Registration failed'])
            return
        }

        if (data.validationErrors?.length > 0) {
            setErrorMessages(data.validationErrors)
            return
        }

        if (data.message.includes('Registered successfully')) {
            setSuccessMessages([data.message])
            setTimeout(() => { navigate('/sign-in') }, 2000)
            return
        }

        setErrorMessages([data.message])
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
                    <label htmlFor="reEnteredPassword" className="form-label">
                        Re-enter password
                    </label>
                    <input
                        type="password"
                        className="form-control rounded-0"
                        id="reEnteredPassword"
                        value={reEnteredPassword}
                        onChange={
                            event => setReEnteredPassword(event.target.value)
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
            <Link to="/sign-in" className="nav-link ps-0">
                Have an account? Sign in
            </Link>
        </div>
    )
}

export default RegisterPage
