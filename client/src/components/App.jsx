import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthContext from '../contexts/auth/useAuthContext.js'
import Navbar from './Navbar'
import MainPage from './MainPage'
import RegisterPage from './RegisterPage'
import SignInPage from './SignInPage'
import SettingsPage from './SettingsPage'
import ConfirmationPage from './ConfirmationPage'

const App = () => {
    const { setUser } = useAuthContext()
    const backEndUrl = import.meta.env.VITE_BACK_END_URL

    useEffect(() => {
        const checkIfSignedIn = async () => {
            try {
                const response = await fetch(
                    `${backEndUrl}/api/v1/sessions`,
                    { credentials: 'include' }
                )
                if (response.ok) {
                    const data = await response.json()
                    setUser(data.user)
                } else {
                    console.error(`Fetch error: ${response.statusText}`)
                }
            } catch (error) {
                console.error(`Error: ${error.message}`)
            }
        }

        checkIfSignedIn()
    }, [backEndUrl, setUser])

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
                <Route path="/settings" element={<SettingsPage />} />
                <Route
                    path="/confirm"
                    element={<ConfirmationPage backEndUrl={backEndUrl} />}
                />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </>
    )
}

export default App
