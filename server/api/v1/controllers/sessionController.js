import bcryptjs from 'bcryptjs'
import jsonwebtoken from 'jsonwebtoken'
import dbConnection from '../database/database.js'
import validateSession from '../utilities/validateSession.js'

const jwtSecret = process.env.JWT_SECRET
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET

if (!jwtSecret || !jwtRefreshSecret) {
    throw new Error(
        'JWT_SECRET or JWT_REFRESH_SECRET not defined in environment variables'
    )
}

const readSession = async (request, response) => {
    try {
        const decryptedToken = validateSession(request)

        if (decryptedToken === null) {
            return response.status(200).json({ user: null })
        }

        const [rows] = await dbConnection.execute(
            `
                SELECT id, username, email, role, totp_auth_on
                FROM users
                WHERE id = ?;
            `,
            [decryptedToken.id]
        )
        const user = rows[0]

        if (!user) {
            return response.status(200).json({ user: null })
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
                SELECT id, username, email, password, role, verified_by_email
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
        
        if (!user.verified_by_email) {
            return response.status(403).json({
                message: 'Please verify your email address before signing in'
            })
        }

        delete user.password

        const accessToken = jsonwebtoken.sign(
            { id: user.id },
            jwtSecret,
            { expiresIn: '1h' }
        )

        const refreshToken = jsonwebtoken.sign(
            { id: user.id },
            jwtRefreshSecret,
            { expiresIn: '7d' }
        )

        response.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 3600000,
            sameSite: 'Strict'
        })

        response.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: 'Strict'
        })
        
        return response.status(200).json({
            message: 'Signed in successfully',
            user
        })
    } catch (error) {
        console.error(`Error: ${error.message}\nStack trace: ${error.stack}`)
        response.status(500).json({ message: 'Internal server error' })
    }
}

const refreshSession = (request, response) => {
    const refreshToken = request.cookies?.refreshToken

    if (!refreshToken) {
        return response.status(401).json({ message: 'Refresh token not found' })
    }

    try {
        const decryptedToken = jsonwebtoken.verify(
            refreshToken,
            jwtRefreshSecret
        )

        const accessToken = jsonwebtoken.sign(
            { id: decryptedToken.id },
            jwtSecret,
            { expiresIn: '1h' }
        )

        response.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 3600000,
            sameSite: 'Strict'
        })

        return response.status(200).json({ message: 'Session refreshed' })
    } catch (error) {
        console.error(`Error: ${error.message}\nStack trace: ${error.stack}`)
        return response.status(401).json({ message: 'Invalid refresh token' })
    }
}

const deleteSession = (request, response) => {
    response.clearCookie('accessToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict'
    })

    response.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict'
    })

    return response.status(200).json({ message: 'Signed out successfully' })
}

export default {
    readSession,
    createSession,
    refreshSession,
    deleteSession
}
