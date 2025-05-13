import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthContext from '../context/useAuthContext'

const SettingsPage = () => {
    const { user } = useAuthContext()
    const navigate = useNavigate()

    useEffect(() => {
        if (!user) {
            navigate('/sign-in')
        }
    }, [user, navigate])

    return (
        <>
            <h1>This is SettingsPage.jsx</h1>
        </>
    )
}

export default SettingsPage
