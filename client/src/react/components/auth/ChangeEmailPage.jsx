import { useState, useEffect, useRef, useCallback  } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import fetchFromDatabase from '../../../util/fetchFromDatabase.js'
import messageUtility from '../../../util/messageUtility.jsx'

const ChangeEmailPage = ({ backEndUrl }) => {
    const [successMessages, setSuccessMessages] = useState([])
    const [errorMessages, setErrorMessages] = useState([])
    const hasConfirmed = useRef(false)
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const handleChangeEmailSubmit = useCallback(async token => {
        const data = await fetchFromDatabase(
            `${backEndUrl}/api/v1/users/confirm-email-change` +
            `?token=${token}`
        )

        if (!data || data.message.includes('expired')) {
            setSuccessMessages([])
            setErrorMessages([
                data?.message || 'Email change confirmation failed'
            ])
            return
        }

        setErrorMessages([])
        setSuccessMessages([
            data.message || 'Email address updated successfully'
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

        handleChangeEmailSubmit(token)
    }, [searchParams, handleChangeEmailSubmit])

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

export default ChangeEmailPage
