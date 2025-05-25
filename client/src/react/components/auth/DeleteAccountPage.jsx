import { useState, useEffect, useRef, useCallback  } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import fetchFromDatabase from '../../../util/fetchFromDatabase.js'
import messageUtility from '../../../util/messageUtility.jsx'

const DeleteAccountPage = ({ backEndUrl }) => {
    const [successMessages, setSuccessMessages] = useState([])
    const [errorMessages, setErrorMessages] = useState([])
    const hasConfirmed = useRef(false)
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const handleDeleteAccount = useCallback(async token => {
        setSuccessMessages([])
        setErrorMessages([])

        const data = await fetchFromDatabase(
            `${backEndUrl}/api/v1/users?token=${token}`,
            'DELETE'
        )

        if (!data || typeof data !== 'object' || !data.message) {
            setErrorMessages(['Account deletion failed'])
            return
        }

        if (data.message === 'Invalid or expired token') {
            setErrorMessages([data.message])
            return
        }

        if (data.message === 'Account deleted successfully') {
            setSuccessMessages([data.message])
            setTimeout(() => navigate('/'), 2000)
            return
        }

        setErrorMessages(['Account deletion failed'])
    }, [backEndUrl, navigate])

    useEffect(() => {
        const token = searchParams.get('token')

        if (!token) {
            setErrorMessages(['Missing token'])
            return
        }

        if (hasConfirmed.current) return

        hasConfirmed.current = true
        handleDeleteAccount(token)
    }, [searchParams, handleDeleteAccount])

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

export default DeleteAccountPage
