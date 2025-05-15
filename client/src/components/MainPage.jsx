import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import useAuthContext from '../contexts/useAuthContext.js'
import messageUtility from '../utilities/messageUtility.jsx'

const MainPage = () => {
    const { user } = useAuthContext()
    const [successMessages, setSuccessMessages] = useState([])
    const location = useLocation()

    let intro = ''

    if (user) {
        intro = `Hello, ${user.username}`
    } else {
        intro = 'Hello, please sign in to continue'
    }

    const successMessageDisplay =
        messageUtility.displaySuccessMessages(successMessages)

    return (
        <div className="container mt-4">
            {successMessageDisplay}  
            <h1>{intro}</h1>
        </div>
    )
}

export default MainPage
