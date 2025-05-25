import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import fetchFromDatabase from '../../../util/fetchFromDatabase.js'
import messageUtility from '../../../util/messageUtility.jsx'

const ResetPasswordPage = ({ backEndUrl }) => {
    const [email, setEmail] = useState([])
    const [newPassword, setNewPassword] = useState([])
    const [reEnteredPassword, setReEnteredPassword] = useState([])
    const [successMessages, setSuccessMessages] = useState([])
    const [errorMessages, setErrorMessages] = useState([])
    const [searchParams] = useSearchParams()
    const token = searchParams.get('token')
    const navigate = useNavigate()

    useEffect(() => {
        if (!token) {
            setErrorMessages(['Missing token'])
            return
        }
    }, [searchParams, token])

    const handleSubmit = async event => {
        event.preventDefault()
        setSuccessMessages([])
        setErrorMessages([])

        const newErrors = []

        if (!token) newErrors.push('Missing token')

        const passwordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{16,}$/

        const passwordFormatValid = passwordRegex.test(newPassword)
        if (!passwordFormatValid) newErrors.push(
            'Password must be at least 16 characters and include at least ' +
            'one lowercase letter, one capital letter, one number and one ' +
            'symbol (!@#$%^&*)'            
        )

        if (newPassword !== reEnteredPassword) {
            newErrors.push('Passwords must match')
        }
        if (newErrors.length > 0) {
            setErrorMessages(newErrors)
            return
        }

        const data = await fetchFromDatabase(
            `${backEndUrl}/api/v1/verifications/reset-password`,
            'PATCH',
            'application/json',
            'same-origin',
            { email, newPassword, token }
        )
        
        if (!data || typeof data !== 'object' || !data.message) {
            setErrorMessages(['Unknown error'])
            return
        }

        if (data.message === 'Password reset successfully') {
            setSuccessMessages([data.message])
            setTimeout(() => navigate('/sign-in'), 2000)
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
            <h2 className="mb-4">Reset Password</h2>
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
                        New password
                    </label>
                    <input
                        type="password"
                        className="form-control rounded-0"
                        id="newPassword"
                        value={newPassword}
                        onChange={event => setNewPassword(event.target.value)}
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="reEnteredPassword" className="form-label">
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
        </div>
    )
}

export default ResetPasswordPage
