import bcryptjs from 'bcryptjs'
import jsonwebtoken from 'jsonwebtoken'
import { authenticator } from 'otplib'
import dbConnection from '../db/dbConnection.js'
import validateSession from '../util/validateSession.js'
import encryptionUtility from '../util/encryptionUtility.js'

const nodeEnv = process.env.NODE_ENV
if (!nodeEnv) throw new Error('NODE_ENV not defined in .env')
const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret) throw new Error('JWT_SECRET not defined in .env')
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET
if (!jwtRefreshSecret) throw new Error('JWT_REFRESH_SECRET not defined in .env')
const hCaptchaSecret = process.env.HCAPTCHA_SECRET
if (!hCaptchaSecret) throw new Error('HCAPTCHA_SECRET not defined in .env')

const readSession = async (request, response) => {
    try {
        const decryptedToken = validateSession(request)

        if (decryptedToken === null) {
            return response.status(200).json({ user: null })
        }

        const [sqlResult] = await dbConnection.execute(
            `SELECT
                id,
                username,
                email,
                role,
                account_verified,
                totp_auth_on,
                created_at
            FROM users
            WHERE id = ?;`,
            [decryptedToken.id]
        )
        const user = sqlResult[0]

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
    const { email, password, hCaptchaToken } = request.body

    if (!hCaptchaToken) {
        return response.status(400).json({
            message: 'hCaptcha token missing'
        })
    }

    try {
        const hCaptchaResponse = await fetch(
            'https://hcaptcha.com/siteverify',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    secret: hCaptchaSecret,
                    response: hCaptchaToken
                })
            }
        )
        const hCaptchaValidation = await hCaptchaResponse.json()

        if (!hCaptchaValidation.success) {
            return response.status(400).json({
                message: 'hCaptcha verification failed'
            })
        }        

        const [sqlResult] = await dbConnection.execute(
            `SELECT
                id,
                username,
                email,
                password,
                role,
                account_verified,
                totp_auth_on,
                created_at
            FROM users
            WHERE email = ?;`,
            [email]
        )

        const user = sqlResult[0]

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
        
        if (!user.account_verified) {
            return response.status(403).json({
                message: 'Please verify your email address before signing in'
            })
        }

        if (user.totp_auth_on) {
            return response.status(200).json({
                message: 'Please enter your 6-digit TOTP',
                requireTotp: true,
                userId: user.id
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
            secure: nodeEnv === 'production',
            maxAge: 3600000,
            sameSite: nodeEnv === 'production' ? 'none' : 'lax'
        })

        response.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: nodeEnv === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: nodeEnv === 'production' ? 'none' : 'lax'
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

const deleteSession = (request, response) => {
    response.clearCookie('accessToken', {
        httpOnly: true,
        secure: nodeEnv === 'production',
        sameSite: nodeEnv === 'production' ? 'none' : 'lax'
    })

    response.clearCookie('refreshToken', {
        httpOnly: true,
        secure: nodeEnv === 'production',
        sameSite: nodeEnv === 'production' ? 'none' : 'lax'
    })

    return response.status(200).json({ message: 'Signed out successfully' })
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
            secure: nodeEnv === 'production',
            maxAge: 3600000,
            sameSite: nodeEnv === 'production' ? 'none' : 'lax'
        })

        return response.status(200).json({ message: 'Session refreshed' })
    } catch (error) {
        console.error(`Error: ${error.message}\nStack trace: ${error.stack}`)
        return response.status(401).json({ message: 'Invalid refresh token' })
    }
}

const verifyTotp = async (request, response) => {
    const { userId, totpCode } = request.body

    if (!userId || !totpCode) {
        return response.status(400).json({
            message: 'userId and 6-digit TOTP required'
        })
    }

    try {
        const [sqlResult] = await dbConnection.execute(
            `SELECT
                id,
                username,
                email,
                role,
                account_verified,
                totp_auth_on,
                created_at,
                totp_auth_secret,
                totp_auth_init_vector,
                totp_auth_tag
            FROM users
            WHERE id = ?;`,
            [userId]
        )
        const user = sqlResult[0]

        if (!user) {
            return response.status(404).json({
                message: 'User not found'
            })
        }

        const decryptedTotpSecret = encryptionUtility.decryptTotpSecret({
            encryptedTotpSecret: user.totp_auth_secret,
            initVector: user.totp_auth_init_vector,
            authTag: user.totp_auth_tag
        })

        const totpValid = authenticator.verify({
            token: totpCode,
            secret: decryptedTotpSecret
        })

        if (!totpValid) {
            return response.status(401).json({
                message: 'Invalid TOTP'
            })
        }

        delete user.totp_auth_secret, user.totp_init_vector, user.totp_tag

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
            secure: nodeEnv === 'production',
            maxAge: 3600000,
            sameSite: nodeEnv === 'production' ? 'none' : 'lax'
        })

        response.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: nodeEnv === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: nodeEnv === 'production' ? 'none' : 'lax'
        })

        return response.status(200).json({
            message: 'Signed in successfully',
            user
        })
    } catch (error) {
        console.error(`Error: ${error.message}\nStack trace: ${error.stack}`)
        return response.status(500).json({ message: 'Internal server error' })
    }
}

export default {
    readSession,
    createSession,
    deleteSession,
    refreshSession,
    verifyTotp
}
