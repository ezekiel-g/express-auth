import bcryptjs from 'bcryptjs'
import crypto from 'crypto'
import otplib from 'otplib'
import qrcode from 'qrcode'
import dbConnection from '../db/dbConnection.js'
import validateUser from '../util/validateUser.js'
import validateSession from '../util/validateSession.js'
import handleDbError from '../util/handleDbError.js'
import encryptionUtility from '../util/encryptionUtility.js'
import emailTransporter from '../util/emailTransporter.js'
import verificationEmail from '../templates/verificationEmail.js'
import passwordResetEmail from '../templates/passwordResetEmail.js'
import emailRemovalEmail from '../templates/emailRemovalEmail.js'
import deleteAccountEmail from '../templates/deleteAccountEmail.js'

const appName = process.env.APP_NAME
if (!appName) throw new Error('APP_NAME not defined in .env')
const frontEndUrl = process.env.FRONT_END_URL
if (!frontEndUrl) throw new Error('FRONT_END_URL not defined in .env')

const verifyAccountByEmail = async (request, response) => {
    const { token } = request.query

    try {
        const [sqlResult] = await dbConnection.execute(
            `SELECT u.id, ut.expires_at
            FROM users u
            JOIN user_tokens ut
                ON ut.user_id = u.id
            WHERE ut.token_type = 'account_verification'
                AND ut.token_value = ?;`,
            [token]
        )

        if (sqlResult.length === 0) {
            return response.status(400).json({
                message: 'Invalid or expired token'
            })
        }

        const userAndTokenInfo = sqlResult[0]
        
        if (new Date(userAndTokenInfo.expires_at) < new Date()) {
            return response.status(400).json({
                message: 'Invalid or expired token'
            })
        }

        await dbConnection.execute(
            'UPDATE users SET account_verified = 1 WHERE id = ?;',
            [userAndTokenInfo.id]
        )

        await dbConnection.execute(
            `UPDATE user_tokens
            SET used_at = CURRENT_TIMESTAMP
            WHERE token_value = ?
                AND token_type = 'account_verification';`,
            [token]
        )

        return response.status(200).json({
            message: 'Email address verified successfully'
        })
    } catch (error) {
        return handleDbError(response, error)
    }
}

const confirmEmailChange = async (request, response) => {
    const { token } = request.query
        
    try {
        const [sqlResult] = await dbConnection.execute(
            `SELECT
                u.id,
                u.email,
                u.email_pending,
                ut.token_value,
                ut.expires_at
            FROM users u
            JOIN user_tokens ut ON u.id = ut.user_id
            WHERE ut.token_type = 'email_change' AND ut.token_value = ? 
            AND ut.used_at IS NULL;`,
            [token]
        )

        if (sqlResult.length === 0) { 
            return response.status(400).json({
                message: 'Invalid or expired token'
            })
        }

        const user = sqlResult[0]
        
        if (
            !user.email_pending ||
            new Date(user.expires_at) < new Date()
        ) {
            return response.status(400).json({
                message: 'Invalid or expired token'
            })
        }

        const oldEmail = user.email

        await dbConnection.execute(
            `UPDATE users
            SET email = email_pending, email_pending = NULL
            WHERE id = ?;`,
            [user.id]
        )

        await dbConnection.execute(
            `UPDATE user_tokens SET used_at = CURRENT_TIMESTAMP 
                WHERE user_id = ?
                AND token_type = 'email_change'
                AND token_value = ?;`,
            [user.id, token]
        )

        await emailTransporter.sendMail({
            from: process.env.EMAIL_USER,
            to: oldEmail,
            subject: `Your email address has been removed from ${appName}`,
            html: emailRemovalEmail()
        })

        return response.status(200).json({
            message: 'Email address updated successfully'
        })
    } catch (error) {
        return handleDbError(response, error)
    }
}

const validateUserInfoForUpdate = async (request, response) => {
    const { id, username, email, password, reEnteredPassword } = request.body

    try {
        validateSession(request, id)

        const validationErrors = []

        const usernameValid = await validateUser.validateUsername(username, id)
        if (!usernameValid.valid) validationErrors.push(usernameValid.message)
        
        const emailValid = await validateUser.validateEmail(email, id)
        if (!emailValid.valid) validationErrors.push(emailValid.message)

        if (password) {
            const passwordValid =
                await validateUser.validatePassword(password, id)
            if (!passwordValid.valid) {
                validationErrors.push(passwordValid.message)
            }
        }
        
        if (
            (password && password !== reEnteredPassword) ||
            (!password && reEnteredPassword)
        ) {
            validationErrors.push('Passwords must match')
        }

        if (validationErrors.length === 0) {
            const changeHappened = await validateUser.checkForChanges(
                { email, username, password },
                id
            )
            
            if (!changeHappened.valid) {
                validationErrors.push(changeHappened.message)
            }
        }

        const statusCode = validationErrors.length === 0 ? 200 : 400
        const messageText = validationErrors.length === 0
            ? 'Input validation passed'
            : 'Input validation failed'

        return response.status(statusCode).json({
            message: messageText,
            validationErrors
        })
    } catch (error) {
        return handleDbError(response, error)
    }
}

const getTotpSecret = async (request, response) => {
    const { id } = request.body    

    if (!id) {
        console.error('`id: user.id` required in POST body')
        return response.status(400).json({ message: 'Error in request'})
    }

    try {
        validateSession(request, id)
        
        const [sqlResult] = await dbConnection.execute(
            'SELECT email FROM users WHERE id = ?;',
            [id]
        )

        if (sqlResult.length === 0) {
            return response.status(404).json({ message: 'User not found' })
        }

        const totpSecret = otplib.authenticator.generateSecret()
        const totpUri = otplib.authenticator.keyuri(
            sqlResult[0].email,
            appName,
            totpSecret
        )
        const qrCodeImage = await qrcode.toDataURL(totpUri)
        
        return response.status(200).json({ totpSecret, qrCodeImage })
    } catch (error) {
        return response.status(401).json({ message: error.message })
    }
}

const resendVerificationEmail = async (request, response) => {
    const { email } = request.body
    const successMessage =
        'If you entered an email address that is pending verification, ' +
        'then a new verification email will be sent to that address'
    
    try {
        const [sqlResult] = await dbConnection.execute(
            `SELECT id, username, account_verified
            FROM users
            WHERE email = ?;`,
            [email]
        )

        if (sqlResult.length === 0) {
            console.warn(
                'Verification email resend attempted for unknown email: ' +
                email
            )
            return response.status(200).json({ message: successMessage })
        }

        const user = sqlResult[0]

        if (user.account_verified) {
            return response.status(200).json({ message: successMessage })
        }

        const newToken = crypto.randomBytes(32).toString('hex')
        const tokenExpires = new Date(Date.now() + 60 * 60 * 1000)

        await dbConnection.execute(
            `INSERT INTO user_tokens (
                user_id,
                token_type,
                token_value,
                expires_at
            ) VALUES (?, 'account_verification', ?, ?)
            ON DUPLICATE KEY UPDATE
                token_value = VALUES(token_value),
                expires_at = VALUES(expires_at),
                created_at = CURRENT_TIMESTAMP,
                used_at = NULL;`,
            [user.id, newToken, tokenExpires]
        )

        const verificationLink =
            `${frontEndUrl}/verify-email?token=${newToken}`
        const emailContent = verificationEmail(user.username, verificationLink)

        await emailTransporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: `Please confirm your email address for ${appName}`,
            html: emailContent
        })

        return response.status(200).json({ message: successMessage })
    } catch (error) {
        return handleDbError(response, error)
    }
}

const sendPasswordResetEmail = async (request, response) => {
    const { email } = request.body
    const successMessage =
        'If the email address is associated with an account, ' +
        'then a password reset link has been sent'
    
    try {
        const [sqlResult] = await dbConnection.execute(
            'SELECT id, username FROM users WHERE email = ?;',
            [email]
        )

        if (sqlResult.length === 0) {
            console.warn(`Password reset requested for unknown email: ${email}`)
            return response.status(200).json({ message: successMessage })
        }

        const user = sqlResult[0]
        const resetToken = crypto.randomBytes(32).toString('hex')
        const tokenExpires = new Date(Date.now() + 60 * 60 * 1000)

        await dbConnection.execute(
            `INSERT INTO user_tokens (
                user_id,
                token_type,
                token_value,
                expires_at
            ) VALUES (?, 'password_reset', ?, ?)
            ON DUPLICATE KEY UPDATE
                token_value = VALUES(token_value),
                expires_at = VALUES(expires_at),
                created_at = CURRENT_TIMESTAMP,
                used_at = NULL;`,
            [user.id, resetToken, tokenExpires]
        )

        const resetLink = `${frontEndUrl}/reset-password?token=${resetToken}`
        const emailContent = passwordResetEmail(user.username, resetLink)

        await emailTransporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: `Reset your password for ${appName}`,
            html: emailContent
        })

        return response.status(200).json({ message: successMessage })
    } catch (error) {
        return handleDbError(response, error)
    }
}

const requestDeleteUser = async (request, response) => {
    const { id } = request.body    
    
    if (!id) {
        console.error('`id: user.id` required in POST body')
        return response.status(400).json({ message: 'Error in request'})
    }
    
    try {
        validateSession(request, id)
        
        const [sqlResult] = await dbConnection.execute(
            'SELECT username, email FROM users WHERE id = ?;',
            [id]
        )
        
        if (sqlResult.length === 0) {
            return response.status(404).json({ message: 'User not found' })
        }

        const deleteAccountToken = crypto.randomBytes(32).toString('hex')
        const tokenExpires = new Date(Date.now() + 60 * 60 * 1000)

        await dbConnection.execute(
            `INSERT INTO user_tokens (
                user_id,
                token_type,
                token_value,
                expires_at
            ) VALUES (?, 'account_deletion', ?, ?)
            ON DUPLICATE KEY UPDATE
                token_value = VALUES(token_value),
                expires_at = VALUES(expires_at),
                created_at = CURRENT_TIMESTAMP,
                used_at = NULL;`,
            [id, deleteAccountToken, tokenExpires]
        )

        const deleteAccountLink =
            `${frontEndUrl}/delete-account?token=${deleteAccountToken}`
        const emailContent =
            deleteAccountEmail(sqlResult[0].username, deleteAccountLink)

        await emailTransporter.sendMail({
            from: process.env.EMAIL_USER,
            to: sqlResult[0].email,
            subject: `Confirm account deletion for ${appName}`,
            html: emailContent
        })

        return response.status(200).json({
            message: 'Account deletion requested — ' +
                     'please check your email to confirm'
        })
    } catch (error) {
        return handleDbError(response, error)
    }
}

const setTotpAuth = async (request, response) => {
    const { id, totpAuthOn, totpSecret, totpCode } = request.body    
    
    if (!id) {
        console.error('`id: user.id` required in POST body')
        return response.status(400).json({ message: 'Error in request'})
    }

    try {
        validateSession(request, id)
        
        if (!totpAuthOn) {
            await dbConnection.execute(
                `UPDATE users
                SET 
                    totp_auth_on = 0, 
                    totp_auth_secret = NULL,
                    totp_auth_init_vector = NULL,
                    totp_auth_tag = NULL 
                WHERE id = ?;`,
                [id]
            )

            return response.status(200).json({
                message: 'Two-factor authentication disabled successfully'
            })
        }
        
        if (!totpSecret || !totpCode) {
            return response.status(400).json({
                message: 'Missing required 2FA fields'
            })
        }
        
        const isValid = otplib.authenticator.check(totpCode, totpSecret)
        
        if (!isValid) {
            return response.status(400).json({
                message: 'Invalid authentication code'
            })
        }
        
        const { encryptedTotpSecret, initVector, authTag } =
            encryptionUtility.encryptTotpSecret(totpSecret)
        
        await dbConnection.execute(
            `UPDATE users
            SET 
                totp_auth_on = 1, 
                totp_auth_secret = ?, 
                totp_auth_init_vector = ?, 
                totp_auth_tag = ? 
            WHERE id = ?;`,
            [encryptedTotpSecret, initVector, authTag, id]
        )
        
        return response.status(200).json({
            message: 'Two-factor authentication enabled successfully'
        })
    } catch (error) {
        return handleDbError(response, error)
    }
}

const resetPassword = async (request, response) => {
    const { email, newPassword, token } = request.body

    if (!email || !newPassword || !token) {
        return response.status(400).json({
            message: 'Token, email address and new password required'
        })
    }

    try {
        const [sqlResultUser] = await dbConnection.execute(
            'SELECT id FROM users WHERE email = ?;',
            [email]
        )
        
        if (sqlResultUser.length === 0) {
            return response.status(400).json({
                message: 'Invalid/expired token or invalid email address'
            })
        }
        
        const user = sqlResultUser[0]
        const [sqlResultToken] = await dbConnection.execute(
            `SELECT token_value, expires_at
            FROM user_tokens
            WHERE user_id = ? AND token_type = 'password_reset'
            AND token_value = ? AND used_at IS NULL;`,
            [user.id, token]
        )       
        
        if (
            sqlResultToken.length === 0 ||
            new Date(sqlResultToken[0].expires_at) < new Date()
        ) {
            return response.status(400).json({
                message: 'Invalid/expired token or invalid email address'
            })
        }

        const salt = await bcryptjs.genSalt(10)
        const hashedPassword = await bcryptjs.hash(newPassword, salt)

        const [sqlUpdateUser] = await dbConnection.execute(
            'UPDATE users SET password = ? WHERE id = ?;',
            [hashedPassword, user.id]
        )

        await dbConnection.execute(
            `UPDATE user_tokens
             SET used_at = CURRENT_TIMESTAMP
             WHERE user_id = ? AND token_type = 'password_reset'
             AND token_value = ?;`,
            [user.id, token]
        )

        if (sqlUpdateUser.affectedRows === 0) {
            console.warn(`Password reset attempted for unknown email: ${email}`)
            return response.status(200).json({
                message: 'Password reset request received'
            })
        }
        
        return response.status(200).json({
            message: 'Password reset successfully'
        })
    } catch (error) {
        return handleDbError(response, error)
    }
}

export default {
    verifyAccountByEmail,
    confirmEmailChange,
    validateUserInfoForUpdate,
    getTotpSecret,
    resendVerificationEmail,
    sendPasswordResetEmail,
    requestDeleteUser,
    setTotpAuth,
    resetPassword
}
