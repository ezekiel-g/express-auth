import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import fetchFromDatabase from '../../../util/fetchFromDatabase.js'
import messageUtility from '../../../util/messageUtility.jsx'

const VerifyEmailPage = ({ backEndUrl }) => {
    const [successMessages, setSuccessMessages] = useState([])
    const [errorMessages, setErrorMessages] = useState([])
    const hasConfirmed = useRef(false)
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const verifyAccountByEmail = useCallback(async token => {
        const data = await fetchFromDatabase(
            `${backEndUrl}/api/v1/users/verify-account-by-email` +
            `?token=${token}`
        )
        
        if (!data || data.message.includes('expired')) {
            setSuccessMessages([])
            setErrorMessages([
                data?.message || 'Verification failed'
            ])
            return
        }

        setErrorMessages([])
        setSuccessMessages([
            data.message || 'Email verified successfully'
        ])

        setTimeout(() => navigate('/sign-in'), 2000)
    }, [backEndUrl, navigate])

    useEffect(() => {
        const token = searchParams.get('token')
        if (!token) {
            setErrorMessages(['Missing token'])
            return
        }
        if (hasConfirmed.current) return
        hasConfirmed.current = true

        verifyAccountByEmail(token)
    }, [searchParams, verifyAccountByEmail])

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
