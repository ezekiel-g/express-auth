import { Routes, Route } from 'react-router-dom'
import Navbar from './Navbar'
import MainPage from './MainPage'
import RegisterPage from './RegisterPage'
import SignInPage from './SignInPage'
import SettingsPage from './SettingsPage'

function App() {


    return (
        <>
            <Navbar />
            <Routes>
                <Route path="/" element={<MainPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/sign-in" element={<SignInPage />} />
                <Route path="/settings" element={<SettingsPage />} />
            </Routes>
        </>
    )
}

export default App
