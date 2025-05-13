import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useAuthContext from '../context/useAuthContext'
import validateUser from '../utilities/validateUser.js'

const RegisterPage = ({ backEndUrl }) => {
    const { user } = useAuthContext()
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmedPassword, setConfirmedPassword] = useState('')
    const [errors, setErrors] = useState([])
    const navigate = useNavigate()

    useEffect(() => {
        if (user) navigate('/')
    }, [user, navigate])

    const handleSubmit = async event => {
        event.preventDefault()
        setErrors([])

        const newErrors = []

        const usernameValid = validateUser.validateUsername(username)
        if (!usernameValid.valid) newErrors.push(usernameValid.message)

        const emailValid = validateUser.validateEmail(email)
        if (!emailValid.valid) newErrors.push(emailValid.message)

        const passwordValid = validateUser.validatePassword(password)
        if (!passwordValid.valid) newErrors.push(passwordValid.message)

        if (password !== confirmedPassword) {
            newErrors.push('Passwords must match')
        }

        if (newErrors.length > 0) {
            setErrors(newErrors)
            return
        }

        try {
            const response = await fetch(`${backEndUrl}/api/v1/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password }),
                credentials: 'include'
            })
            const data = await response.json()

            if (!response.ok) {
                setErrors([data.message || 'Registration failed'])
                return
            }

            navigate('/sign-in', { state: {
                message: 'Registered successfully — please sign in'
            } })
        } catch (error) {
            setErrors(['Server connection error'])
            console.error(`Error: ${error.message}`)
        }
    }

    let errorDisplay = <></>

    if (errors.length > 0) {
        errorDisplay = errors.map((error, index) => {
            return (
                <div className="alert alert-danger rounded-0" key={index}>
                    {error}
                </div>
            )
        })
    }

    return (
        <div className="container mt-5 px-5">
            <h2 className="mb-4">Register</h2>
            <form onSubmit={handleSubmit}>
                {errorDisplay}
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
                        Password (confirm)
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
