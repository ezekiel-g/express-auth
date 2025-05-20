import useAuthContext from '../contexts/auth/useAuthContext.js'

const MainPage = () => {
    const { user } = useAuthContext()

    let intro = ''

    if (!user) {
        intro = 'Hello, please sign in to continue'
    } else {
        intro = `Hello, ${user.username}`
    }

    return (
        <div className="container mt-4">
            <h1>{intro}</h1>
        </div>
    )
}

export default MainPage
