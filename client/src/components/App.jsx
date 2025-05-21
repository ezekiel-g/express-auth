import { useEffect, useCallback } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthContext from '../contexts/auth/useAuthContext.js'
import Navbar from './Navbar'
import MainPage from './MainPage'
import RegisterPage from './RegisterPage'
import SignInPage from './SignInPage'
import SettingsPage from './SettingsPage'
import TwoFactorPage from './TwoFactorPage.jsx'
import ConfirmationPage from './ConfirmationPage'
import VerifyEmailPage from './VerifyEmailPage'
import ResetPasswordPage from './ResetPasswordPage'
import ChangeEmailPage from './ChangeEmailPage.jsx'
import fetchFromDatabase from '../utilities/fetchFromDatabase.js'

const App = () => {
    const { setUser, loading, setLoading } = useAuthContext()
    const backEndUrl = import.meta.env.VITE_BACK_END_URL

    const checkIfSignedIn = useCallback(async () => {
        const data = await fetchFromDatabase(
            `${backEndUrl}/api/v1/sessions`,
            'GET',
            'application/json',
            'include'
        )

        if (!data || typeof data !== 'object' || !data.user) {
            setUser(null)
            setLoading(false)
            return
        }

        setUser(data.user)
        setLoading(false)
    }, [backEndUrl, setUser, setLoading])

    useEffect(() => {
        setLoading(true)
        checkIfSignedIn()
    }, [setLoading, checkIfSignedIn])

    if (loading) return <div>Loading...</div>

    return (
        <>
            <Navbar />
            <Routes>
                <Route path="/" element={<MainPage />} />
                <Route
                    path="/register"
                    element={<RegisterPage backEndUrl={backEndUrl} />}
                />
                <Route
                    path="/sign-in"
                    element={<SignInPage backEndUrl={backEndUrl} />}
                />
                <Route
                    path="/settings"
                    element={<SettingsPage backEndUrl={backEndUrl} />}
                />
                <Route
                    path="/settings/two-factor-authentication"
                    element={<TwoFactorPage backEndUrl={backEndUrl} />}
                />
                <Route
                    path="/confirm"
                    element={<ConfirmationPage backEndUrl={backEndUrl} />}
                />
                <Route
                    path="/verify-email"
                    element={<VerifyEmailPage backEndUrl={backEndUrl} />}
                />
                <Route
                    path="/reset-password"
                    element={<ResetPasswordPage backEndUrl={backEndUrl} />}
                />
                <Route
                    path="/change-email"
                    element={<ChangeEmailPage backEndUrl={backEndUrl} />}
                />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </>
    )
}

export default App
