import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import AuthProvider from './react/contexts/auth/AuthProvider'
import App from './react/components/App'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <App />
            </AuthProvider>
        </BrowserRouter>
    </StrictMode>
)
