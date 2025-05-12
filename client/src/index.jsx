import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './react/App.jsx'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <App />
    </StrictMode>
)
