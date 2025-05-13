import bcryptjs from 'bcryptjs'
import jsonwebtoken from 'jsonwebtoken'
import dbConnection from '../database/database.js'

const jwtSecret = process.env.JWT_SECRET

if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined in environment variables')
}

const readSession = async (request, response) => {
    try {
        const accessToken = request.cookies.accessToken
        if (!accessToken) {
            return response.status(200).json({ message: 'Not signed in' })
        }

        let decryptedToken

        try {
            decryptedToken = jsonwebtoken.verify(accessToken, jwtSecret)
        } catch (error) {
            if (error instanceof jsonwebtoken.JsonWebTokenError) {
                return response.status(401).json({
                    message: 'Invalid or expired token'
                })
            }
            throw error
        }

        const [rows] = await dbConnection.execute(
            `
                SELECT id, username, email, role
                FROM users
                WHERE id = ?;
            `,
            [decryptedToken.id]
        )
        const user = rows[0]

        if (!user) {
            return response.status(401).json({ message: 'Invalid session' })
        }

        return response.status(200).json({ user })
    } catch (error) {
        console.error(`Error: ${error.message}\nStack trace: ${error.stack}`)
        return response.status(500).json({ message: 'Internal server error' })
    }
}

const createSession = async (request, response) => {
    const { email, password } = request.body

    try {
        const [rows] = await dbConnection.execute(
            `
                SELECT id, username, email, password, role
                FROM users
                WHERE email = ?;
            `,
            [email]
        )
        const user = rows[0]

        if (!user) {
            return response.status(401).json({
                message: 'Invalid credentials'
            })
        }

        const passwordMatch = await bcryptjs.compare(password, user.password)

        if (!passwordMatch) {
            return response.status(401).json({
                message: 'Invalid credentials'
            })
        }
        
        delete user.password

        const accessToken = jsonwebtoken.sign(
            { id: user.id },
            jwtSecret,
            { expiresIn: '1h' }
        )

        response.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 3600000,
            sameSite: 'Strict'
        })
        
        return response.status(200).json({ user })
    } catch (error) {
        console.error(`Error: ${error.message}\nStack trace: ${error.stack}`)
        response.status(500).json({ message: 'Internal server error' })
    }
}

const deleteSession = (request, response) => {
    response.clearCookie('accessToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict'
    })

    return response.status(200).json({ message: 'Signed out successfully' })
}

export default { readSession, createSession, deleteSession }
