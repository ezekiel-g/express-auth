import { useState } from 'react'
import AuthContext from './AuthContext'

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [canEditSettings, setCanEditSettings] = useState(false)

    return (
        <AuthContext.Provider value={{
            user,
            setUser,
            canEditSettings,
            setCanEditSettings
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export default AuthProvider
