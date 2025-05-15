import useAuthContext from '../contexts/useAuthContext.js'

const MainPage = () => {
    const { user } = useAuthContext()

    let intro = ''

    if (user) {
        intro = `Hello, ${user.username}`
    } else {
        intro = 'Hello, please sign in to continue'
    }

    return (
        <div className="container mt-4">
            <h1>{intro}</h1>
        </div>
    )
}

export default MainPage
