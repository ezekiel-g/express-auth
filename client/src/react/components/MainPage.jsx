import useAuthContext from '../contexts/auth/useAuthContext.js'

const MainPage = () => {
    const { user } = useAuthContext()

    const intro = !user
        ? 'Hello, please sign in to continue'
        : `Hello, ${user.username}`

    return (
        <div className="container mt-4">
            <h1>{intro}</h1>
        </div>
    )
}

export default MainPage
