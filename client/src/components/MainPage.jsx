import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import useAuthContext from '../context/useAuthContext'

const MainPage = () => {
    const { user } = useAuthContext()
    const [flashMessage, setFlashMessage] = useState('')
    const location = useLocation()

    useEffect(() => {
        if (location.state?.message) {
            setFlashMessage(location.state.message)

            const timer = setTimeout(() => {
                setFlashMessage('')
            }, 3000)

            return () => clearTimeout(timer)
        }
    }, [location.state])

    let intro

    if (user) {
        intro = `Hello, ${user.username}`
    } else {
        intro = 'Hello, please sign in to continue'
    }

    let flashMessageDisplay = <></>

    if (flashMessage) {
        flashMessageDisplay = 
            <div className="alert alert-success rounded-0">
                {flashMessage}
            </div>
    }

    return (
        <div className="container mt-4">
            {flashMessageDisplay}  
            <h1>{intro}</h1>
        </div>
    )
}

export default MainPage
