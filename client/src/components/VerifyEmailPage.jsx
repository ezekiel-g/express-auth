import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import messageUtility from '../utilities/messageUtility.jsx'

const VerifyEmailPage = ({ backEndUrl }) => {
    const [successMessages, setSuccessMessages] = useState([])
    const [errorMessages, setErrorMessages] = useState([])
    const hasVerified = useRef(false)
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    useEffect(() => {
        const token = searchParams.get('token')

        if (!token) {
            setErrorMessages(['Missing verification token'])
            return
        }
        if (hasVerified.current) return
        hasVerified.current = true

        const verifyEmail = async () => {
            try {
                const response = await fetch(
                    `${backEndUrl}/api/v1/users/verify-email?token=${token}`
                )

                if (!response.ok) {
                    const errorData = await response.json()
                    setSuccessMessages([])
                    setErrorMessages([
                        errorData.message || 
                        'Verification failed'
                    ])
                    return
                }

                const data = await response.json()
                setErrorMessages([])
                setSuccessMessages([
                    data.message ||
                    'Email verified successfully'
                ])

                setTimeout(() => navigate('/sign-in'), 2000)
            } catch (error) {
                setSuccessMessages([])
                setErrorMessages([error.message || 'Verification failed'])
            }
        }

        verifyEmail()
    }, [searchParams, backEndUrl, navigate])

    const successMessageDisplay =
        messageUtility.displaySuccessMessages(successMessages)
    const errorMessageDisplay =
        messageUtility.displayErrorMessages(errorMessages)

    return (
        <div className="container mt-5 px-5">
            {successMessageDisplay}
            {errorMessageDisplay}
        </div>
    )
}

export default VerifyEmailPage
