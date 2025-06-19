import bcryptjs from 'bcryptjs'
import crypto from 'crypto'
import otplib from 'otplib'
import qrcode from 'qrcode'
import dbConnection from '../db/dbConnection.js'
import validateSession from '../util/validateSession.js'
import encryptionHelper from '../util/encryptionHelper.js'
import emailTransporter from '../util/emailTransporter.js'
import verificationEmail from '../templates/verificationEmail.js'
import passwordResetEmail from '../templates/passwordResetEmail.js'
import emailRemovalEmail from '../templates/emailRemovalEmail.js'
import deleteAccountEmail from '../templates/deleteAccountEmail.js'

const appName = process.env.APP_NAME
const emailUser = process.env.EMAIL_USER
const frontEndUrl = process.env.FRONT_END_URL

if (!appName) throw new Error('APP_NAME not defined in .env')
if (!emailUser) throw new Error('EMAIL_USER not defined in .env')
if (!frontEndUrl) throw new Error('FRONT_END_URL not defined in .env') 

const verifyAccountByEmail = async (request, response) => {
    const sqlResult = await dbConnection.executeQuery(
        `SELECT u.id, ut.expires_at
        FROM users u
        JOIN user_tokens ut
            ON ut.user_id = u.id
        WHERE ut.token_type = 'account_verification'
            AND ut.token_value = ?
            AND ut.used_at IS NULL;`,
        [request.query.token]
    )

    if (
        sqlResult.length === 0 ||
        new Date(sqlResult[0].expires_at) < new Date()
    ) {
        return response.status(400).json({
            message: 'Invalid or expired token'
        })
    }
    
    await dbConnection.executeQuery(
        'UPDATE users SET account_verified = 1 WHERE id = ?;',
        [sqlResult[0].id]
    )

    await dbConnection.executeQuery(
        `UPDATE user_tokens
        SET used_at = CURRENT_TIMESTAMP
        WHERE token_value = ?
            AND token_type = 'account_verification';`,
        [request.query.token]
    )

    return response.status(200).json({
        message: 'Email address verified successfully'
    })
}

const confirmEmailChange = async (request, response) => {
    const sqlResult = await dbConnection.executeQuery(
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
        [request.query.token]
    )
    
    if (
        !sqlResult[0] ||
        !sqlResult[0].email_pending ||
        new Date(sqlResult[0].expires_at) < new Date()
    ) {
        return response.status(400).json({
            message: 'Invalid or expired token'
        })
    }

    await dbConnection.executeQuery(
        `UPDATE users
        SET email = email_pending, email_pending = NULL
        WHERE id = ?;`,
        [sqlResult[0].id]
    )

    await dbConnection.executeQuery(
        `UPDATE user_tokens SET used_at = CURRENT_TIMESTAMP 
            WHERE user_id = ?
            AND token_type = 'email_change'
            AND token_value = ?;`,
        [sqlResult[0].id, request.query.token]
    )

    await emailTransporter.sendMail({
        from: emailUser,
        to: sqlResult[0].email,
        subject: `Your email address has been removed from ${appName}`,
        html: emailRemovalEmail()
    })

    return response.status(200).json({
        message: 'Email address updated successfully'
    })
}

const getTotpSecret = async (request, response) => {
    if (!request.body.id) {
        console.error('`id: user.id` required in POST body')
        return response.status(400).json({ message: 'Error in request'})
    }

    validateSession(request, request.body.id)
    
    const sqlResult = await dbConnection.executeQuery(
        'SELECT email FROM users WHERE id = ?;',
        [request.body.id]
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

}

const resendVerificationEmail = async (request, response) => {
    const sqlResult = await dbConnection.executeQuery(
        `SELECT id, username, account_verified
        FROM users
        WHERE email = ?;`,
        [request.body.email]
    )

    const successMessage =
        'If you entered an email address that is pending verification, ' +
        'then a new verification email will be sent to that address'

    if (sqlResult.length === 0) {
        console.warn(
            'Verification email resend attempted for unknown email: ' +
            request.body.email
        )
        return response.status(200).json({ message: successMessage })
    }

    if (sqlResult[0].account_verified) {
        return response.status(200).json({ message: successMessage })
    }

    const newToken = crypto.randomBytes(32).toString('hex')
    const tokenExpires = new Date(Date.now() + 60 * 60 * 1000)

    await dbConnection.executeQuery(
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
        [sqlResult[0].id, newToken, tokenExpires]
    )

    const verificationLink =
        `${frontEndUrl}/verify-email?token=${newToken}`
    const emailContent =
        verificationEmail(sqlResult[0].username, verificationLink)

    await emailTransporter.sendMail({
        from: emailUser,
        to: request.body.email,
        subject: `Please confirm your email address for ${appName}`,
        html: emailContent
    })

    return response.status(200).json({ message: successMessage })
}

const sendPasswordResetEmail = async (request, response) => {
    const sqlResult = await dbConnection.executeQuery(
        'SELECT id, username FROM users WHERE email = ?;',
        [request.body.email]
    )

    const successMessage =
        'If the email address is associated with an account, ' +
        'then a password reset link has been sent'

    if (sqlResult.length === 0) {
        console.warn(
            `Password reset requested for unknown email: ${request.body.email}`
        )
        return response.status(200).json({ message: successMessage })
    }

    const resetToken = crypto.randomBytes(32).toString('hex')
    const tokenExpires = new Date(Date.now() + 60 * 60 * 1000)

    await dbConnection.executeQuery(
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
        [sqlResult[0].id, resetToken, tokenExpires]
    )

    const resetLink = `${frontEndUrl}/reset-password?token=${resetToken}`
    const emailContent = passwordResetEmail(sqlResult[0].username, resetLink)

    await emailTransporter.sendMail({
        from: emailUser,
        to: request.body.email,
        subject: `Reset your password for ${appName}`,
        html: emailContent
    })

    return response.status(200).json({ message: successMessage })
}

const requestDeleteUser = async (request, response) => {
    if (!request.body.id) {
        console.error('`id: user.id` required in POST body')
        return response.status(400).json({ message: 'Error in request'})
    }
    
    validateSession(request, request.body.id)
    
    const sqlResult = await dbConnection.executeQuery(
        'SELECT username, email FROM users WHERE id = ?;',
        [request.body.id]
    )
    
    if (sqlResult.length === 0) {
        return response.status(404).json({ message: 'User not found' })
    }

    const deleteAccountToken = crypto.randomBytes(32).toString('hex')
    const tokenExpires = new Date(Date.now() + 60 * 60 * 1000)

    await dbConnection.executeQuery(
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
        [request.body.id, deleteAccountToken, tokenExpires]
    )

    const deleteAccountLink =
        `${frontEndUrl}/delete-account?token=${deleteAccountToken}`
    const emailContent =
        deleteAccountEmail(sqlResult[0].username, deleteAccountLink)

    await emailTransporter.sendMail({
        from: emailUser,
        to: sqlResult[0].email,
        subject: `Confirm account deletion for ${appName}`,
        html: emailContent
    })

    return response.status(200).json({
        message: 'Account deletion requested — ' +
                 'please check your email to confirm'
    })
}

const setTotpAuth = async (request, response) => {
    const { id, totpAuthOn, totpSecret, totpCode } = request.body    

    if (!id) {
        console.error('`id: user.id` required in POST body')
        return response.status(400).json({ message: 'Error in request'})
    }

    validateSession(request, id)
    
    if (!totpAuthOn) {
        await dbConnection.executeQuery(
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
        
    if (!otplib.authenticator.check(totpCode, totpSecret)) {
        return response.status(400).json({
            message: 'Invalid authentication code'
        })
    }
    
    const { encryptedTotpSecret, initVector, authTag } =
        encryptionHelper.encryptTotpSecret(totpSecret)
    
    await dbConnection.executeQuery(
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
}

const resetPassword = async (request, response) => {
    const { email, newPassword, token } = request.body

    if (!email || !newPassword || !token) {
        return response.status(400).json({
            message: 'Token, email address and new password required'
        })
    }

    const sqlResultUser = await dbConnection.executeQuery(
        'SELECT id FROM users WHERE email = ?;',
        [email]
    )
    
    if (sqlResultUser.length === 0) {
        return response.status(400).json({
            message: 'Invalid/expired token or invalid email address'
        })
    }
    
    const sqlResultToken = await dbConnection.executeQuery(
        `SELECT token_value, expires_at
        FROM user_tokens
        WHERE user_id = ? AND token_type = 'password_reset'
        AND token_value = ? AND used_at IS NULL;`,
        [sqlResultUser[0].id, token]
    )       
    
    if (
        sqlResultToken.length === 0 ||
        new Date(sqlResultToken[0].expires_at) < new Date()
    ) {
        return response.status(400).json({
            message: 'Invalid/expired token or invalid email address'
        })
    }

    const salt = await bcryptjs.genSalt(12)
    const hashedPassword = await bcryptjs.hash(newPassword, salt)

    const sqlUpdateUser = await dbConnection.executeQuery(
        'UPDATE users SET password = ? WHERE id = ?;',
        [hashedPassword, sqlResultUser[0].id]
    )

    await dbConnection.executeQuery(
        `UPDATE user_tokens
            SET used_at = CURRENT_TIMESTAMP
            WHERE user_id = ? AND token_type = 'password_reset'
            AND token_value = ?;`,
        [sqlResultUser[0].id, token]
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
}

export default {
    verifyAccountByEmail,
    confirmEmailChange,
    getTotpSecret,
    resendVerificationEmail,
    sendPasswordResetEmail,
    requestDeleteUser,
    setTotpAuth,
    resetPassword
}
