import bcryptjs from 'bcryptjs'
import crypto from 'crypto'
import otplib from 'otplib'
import qrcode from 'qrcode'
import dbConnection from '../database/database.js'
import handleDbError from '../utilities/handleDbError.js'
import validateSession from '../utilities/validateSession.js'
import encryptionUtility from '../utilities/encryptionUtility.js'
import emailTransporter from '../utilities/emailTransporter.js'
import verificationEmail from '../templates/verificationEmail.js'
import passwordResetEmail from '../templates/passwordResetEmail.js'
import emailChangeEmail from '../templates/emailChangeEmail.js'
import emailRemovalEmail from '../templates/emailRemovalEmail.js'
// import checkForDuplicates from '../utilities/checkForDuplicates.js'

// // There is already validation for dupliate values both
// // on the front end and from the database, but there is optional
// // duplicate values validation here

const queries = {
    readUsers: 'SELECT * FROM users;',
    readUser: 'SELECT * FROM users WHERE id = ?;',
    createUser: `
        INSERT INTO users (
            username,
            email,
            password,
            role,
            verification_token,
            verification_token_expires_at
        ) VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
        );
    `,
    updateUser: `
        UPDATE users
        SET
            username = ?,
            email_pending = ?,
            password = ?,
            role = ?,
            email_change_token = ?,
            email_change_token_expires_at = ?
        WHERE id = ?;
    `,
    deleteUser: 'DELETE FROM users WHERE id = ?;',
    findUserByVerificationToken: `
        SELECT id, verification_token_expires_at
        FROM users
        WHERE verification_token = ?;
    `,
    verifyAccountByEmail: `
        UPDATE users
        SET
            verified_by_email = 1,
            verification_token = NULL,
            verification_token_expires_at = NULL
        WHERE id = ?;
    `,
    findUserByEmail: 'SELECT * FROM users WHERE email = ?;',
    updateVerificationToken: `
        UPDATE users
        SET
            verification_token = ?,
            verification_token_expires_at = ?
        WHERE id = ?;
    `,
    updatePasswordResetToken: `
        UPDATE users
        SET
            password_reset_token = ?,
            password_reset_token_expires_at = ?
        WHERE id = ?;
    `,
    applyPasswordReset: `
        UPDATE users
        SET
            password = ?,
            password_reset_token = NULL,
            password_reset_token_expires_at = NULL
        WHERE email = ?;
    `,
    updateEmailChangeToken: `
        UPDATE users
        SET
            password_reset_token = ?,
            password_reset_token_expires_at = ?
        WHERE id = ?;
    `,
    findUserByEmailChangeToken: `
        SELECT id, email, email_pending, email_change_token_expires_at
        FROM users
        WHERE email_change_token = ?;
    `,
    applyEmailChange: `
        UPDATE users
        SET
            email = email_pending,
            email_pending = NULL,
            email_change_token = NULL,
            email_change_token_expires_at = NULL
        WHERE id = ?;
    `,
    setTotpAuth: `
        UPDATE users
        SET
            totp_auth_on = ?,
            totp_auth_secret = ?,
            totp_auth_init_vector = ?,
            totp_auth_tag = ?
        WHERE id = ?;
    `
}

const appName = process.env.APP_NAME
if (!appName) throw new Error('APP_NAME not defined in .env')
const frontEndUrl = process.env.FRONT_END_URL
if (!frontEndUrl) throw new Error('FRONT_END_URL not defined in .env')
const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret) throw new Error('JWT_SECRET not defined in .env')

const readUsers = async (request, response) => {
    try {
        const [rows] = await dbConnection.execute(queries.readUsers)
        return response.status(200).json(rows)
    } catch (error) {
        return handleDbError(response, error)
    }    
}

const readUser = async (request, response) => {
    const { id } = request.params
    
    try {
        const [rows] = await dbConnection.execute(queries.readUser, [id])

        if (rows.length === 0) {
            return response.status(404).json({ message: 'User not found' })
        }

        return response.status(200).json(rows[0])
    } catch (error) {
        return handleDbError(response, error)
    }    
}

const createUser = async (request, response) => {
    const { username, email, password } = request.body
    let { role } = request.body
    
    if (!role) role = 'user'

    try {

        // const duplicateCheck = await checkForDuplicates(
        //     response,
        //     { username, email }
        // )
        // if (duplicateCheck !== 'pass') return

        const verificationToken = crypto.randomBytes(32).toString('hex')
        const tokenExpires = new Date(Date.now() + 60 * 60 * 1000)
        const salt = await bcryptjs.genSalt(10)
        const hashedPassword = await bcryptjs.hash(password, salt)
        const [result] = await dbConnection.execute(
            queries.createUser,
            [
                username,
                email,
                hashedPassword,
                role,
                verificationToken,
                tokenExpires
            ]
        )
        const verificationLink =
            `${frontEndUrl}/verify-email?token=${verificationToken}`
        const emailContent = verificationEmail(username, verificationLink) 

        await emailTransporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: `Please confirm your email address for ${appName}`,
            html: emailContent
        })

        return response.status(201).json({
            message: `
                Registered successfully — please check your email to confirm
            `,
            user: {
                id: result.insertId,
                username,
                email,
                role
            }
        })
    } catch (error) {
        return handleDbError(response, error)
    }
}

const updateUser = async (request, response) => {
    const { id } = request.params
    const { username, email, password, role } = request.body

    try {
        validateSession(request, id)

        const [oldDetails] = await dbConnection.execute(queries.readUser, [id])

        if (oldDetails.length === 0) {
            return response.status(404).json({ message: 'User not found' })
        }

        const updatedUsername = username ?? oldDetails[0].username
        let updatedPassword = password ?? oldDetails[0].password
        const updatedRole = role ?? oldDetails[0].role

        // const duplicateCheck = await checkForDuplicates(
        //     response,
        //     { username, email },
        //     id
        // )
        // if (duplicateCheck !== 'pass') return

        let emailChangeToken = null
        let tokenExpires = null
        let emailPending = null
        if (email !== oldDetails[0].email) {
            emailChangeToken = crypto.randomBytes(32).toString('hex')
            tokenExpires = new Date(Date.now() + 60 * 60 * 1000)
            emailPending = email

            await dbConnection.execute(
                queries.updateEmailChangeToken,
                [emailChangeToken, tokenExpires, id]
            )

            const changeEmailLink =
                `${frontEndUrl}/change-email?token=${emailChangeToken}`
            const emailContent =
                emailChangeEmail(updatedUsername, changeEmailLink)

            await emailTransporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: `Confirm your email address change for ${appName}`,
                html: emailContent
            })
        }

        if (password) {
            const salt = await bcryptjs.genSalt(10)
            updatedPassword = await bcryptjs.hash(updatedPassword, salt)
        }

        const [result] = await dbConnection.execute(
            queries.updateUser,
            [
                updatedUsername,
                emailPending,
                updatedPassword,
                updatedRole,
                emailChangeToken,
                tokenExpires,
                id
            ]
        )

        if (result.affectedRows === 0) {
            return response.status(404).json({ message: 'No changes detected' })
        }

        let successMessage = 'User updated successfully'
        if (email !== oldDetails[0].email) {
            successMessage =
                successMessage.concat(' — check email to confirm email change')
        }

        return response.status(200).json({
            message: successMessage,
            user: {
                id,
                username: updatedUsername,
                email: oldDetails[0].email,
                role: updatedRole
            }
        })
    } catch (error) {
        return handleDbError(response, error)
    }    
}

const deleteUser = async (request, response) => {
    const { id } = request.params

    try {
        validateSession(request, id)

        const [result] = await dbConnection.execute(queries.deleteUser, [id])

        if (result.affectedRows === 0) {
            return response.status(404).json({ message: 'User not found' })
        }

        return response.status(200).json({
            message: 'Account deleted successfully'
        })
    } catch (error) {
        return handleDbError(response, error)
    }    
}

const verifyAccountByEmail = async (request, response) => {
    const { token } = request.query

    try {
        const [rows] =
            await dbConnection.execute(queries.findUserByVerificationToken, [token])

        if (rows.length === 0) {
            return response.status(400).json({
                message: 'Invalid or expired token'
            })
        }

        const user = rows[0]

        if (new Date(user.verification_token_expires_at) < new Date()) {
            return response.status(400).json({
                message: 'Invalid or expired token'
            })
        }

        await dbConnection.execute(queries.verifyAccountByEmail, [user.id])

        return response.status(200).json({
            message: 'Email address verified successfully'
        })
    } catch (error) {
        return handleDbError(response, error)
    }
}

const resendVerificationEmail = async (request, response) => {
    const { email } = request.body
    const successMessage =
        'If you entered an email address that is pending verification, ' +
        'a new verification email will be sent to that address'
    
    try {
        const [rows] =
            await dbConnection.execute(queries.findUserByEmail, [email])

        if (rows.length === 0) {
            console.warn(
                'Verification email resend attempted for unknown email: ' +
                email
            )
            return response.status(200).json({ message: successMessage })
        }

        const user = rows[0]

        if (user.verified_by_email) {
            return response.status(200).json({ message: successMessage })
        }

        const newToken = crypto.randomBytes(32).toString('hex')
        const tokenExpires = new Date(Date.now() + 60 * 60 * 1000)

        await dbConnection.execute(
            queries.updateVerificationToken,
            [newToken, tokenExpires, user.id]
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
        const [rows] = await dbConnection.execute(
            queries.findUserByEmail,
            [email]
        )

        if (rows.length === 0) {
            console.warn(`Password reset requested for unknown email: ${email}`)
            return response.status(200).json({ message: successMessage })
        }

        const user = rows[0]
        const resetToken = crypto.randomBytes(32).toString('hex')
        const tokenExpires = new Date(Date.now() + 60 * 60 * 1000)

        await dbConnection.execute(
            queries.updatePasswordResetToken,
            [resetToken, tokenExpires, user.id]
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

const resetPassword = async (request, response) => {
    const { email, newPassword, token } = request.body

    if (!email || !newPassword || !token) {
        return response.status(400).json({
            message: 'Token, email address and new password required'
        })
    }

    try {
        const [rows] = await dbConnection.execute(
            queries.findUserByEmail,
            [email]
        )
        
        if (rows.length === 0) {
            return response.status(400).json({
                message: 'Invalid/expired token or invalid email address'
            })
        }

        const user = rows[0]
        
        if (
            user.password_reset_token !== token ||
            new Date(user.password_reset_token_expires_at) < new Date()
        ) {
            return response.status(400).json({
                message: 'Invalid/expired token or invalid email address'
            })
        }

        const salt = await bcryptjs.genSalt(10)
        const hashedPassword = await bcryptjs.hash(newPassword, salt)

        const [result] = await dbConnection.execute(
            queries.applyPasswordReset,
            [hashedPassword, email]
        )

        if (result.affectedRows === 0) {
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

const confirmEmailChange = async (request, response) => {
    const { token } = request.query
        
    try {
        const [rows] = await dbConnection.execute(
            queries.findUserByEmailChangeToken,
            [token]
        )

        if (rows.length === 0) { 
            return response.status(400).json({
                message: 'Invalid or expired token'
            })
        }

        const user = rows[0]
        
        if (
            !user.email_pending ||
            new Date(user.email_change_token_expires_at) < new Date()
        ) {
            return response.status(400).json({
                message: 'Invalid or expired token'
            })
        }

        const oldEmail = user.email

        await dbConnection.execute(queries.applyEmailChange, [user.id])

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

const getTotpSecret = async (request, response) => {
    const { id } = request.params

    try {
        validateSession(request)

        const [userRows] = await dbConnection.execute(queries.readUser, [id])
        const totpSecret = otplib.authenticator.generateSecret()
        const totpUri = otplib.authenticator.keyuri(
            userRows[0].email,
            appName,
            totpSecret
        )
        const qrCodeImage = await qrcode.toDataURL(totpUri)
        

        return response.status(200).json({ totpSecret, qrCodeImage })
    } catch (error) {
        return response.status(401).json({ message: error.message })
    }
}

const setTotpAuth = async (request, response) => {
    const { id } = request.params
    const { totpAuthOn, totpSecret, totpCode } = request.body    

    try {
        validateSession(request, id)

        if (!totpAuthOn) {
            await dbConnection.execute(
                queries.setTotpAuth,
                [0, null, null, null, id]
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
            queries.setTotpAuth,
            [1, encryptedTotpSecret, initVector, authTag, id]
        )

        return response.status(200).json({
            message: 'Two-factor authentication enabled successfully'
        })
    } catch (error) {
        return handleDbError(response, error)
    }
}

export default {
    readUsers,
    readUser,
    createUser,
    updateUser,
    deleteUser,
    verifyAccountByEmail,
    resendVerificationEmail,
    sendPasswordResetEmail,
    resetPassword,
    confirmEmailChange,
    getTotpSecret,
    setTotpAuth
}
