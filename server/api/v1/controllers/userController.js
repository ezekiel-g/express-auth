import bcryptjs from 'bcryptjs'
import crypto from 'crypto'
import dbConnection from '../db/dbConnection.js'
import validateUser from '../util/validateUser.js'
import validateSession from '../util/validateSession.js'
import handleDbError from '../util/handleDbError.js'
import emailTransporter from '../util/emailTransporter.js'
import verificationEmail from '../templates/verificationEmail.js'
import emailChangeEmail from '../templates/emailChangeEmail.js'

const appName = process.env.APP_NAME
if (!appName) throw new Error('APP_NAME not defined in .env')
const frontEndUrl = process.env.FRONT_END_URL
if (!frontEndUrl) throw new Error('FRONT_END_URL not defined in .env')

const readUsers = async (request, response) => {
    try {
        const [sqlResult] = await dbConnection.execute('SELECT * FROM users;')
        return response.status(200).json(sqlResult)
    } catch (error) {
        return handleDbError(response, error)
    }    
}

const readUser = async (request, response) => {
    const { id } = request.params
    
    try {
        const [sqlResult] = await dbConnection.execute(
            'SELECT * FROM users WHERE id = ?;',
            [id]
        )

        if (sqlResult.length === 0) {
            return response.status(404).json({ message: 'User not found' })
        }

        return response.status(200).json(sqlResult[0])
    } catch (error) {
        return handleDbError(response, error)
    }    
}

const createUser = async (request, response) => {
    const { username, email, password, reEnteredPassword } = request.body
    let { role } = request.body

    if (!role) role = 'user'

    try {
        const validationObject =
            await validateUser({ username, email, password, reEnteredPassword })
        
        if (!validationObject.valid) {
            return response.status(400).json({
                message: 'Input validation failed',
                validationErrors: validationObject.validationErrors
            })
        }        

        const verificationToken = crypto.randomBytes(32).toString('hex')
        const tokenExpires = new Date(Date.now() + 60 * 60 * 1000)
        const salt = await bcryptjs.genSalt(10)
        const hashedPassword = await bcryptjs.hash(password, salt)
        const [sqlResult] = await dbConnection.execute(
            `INSERT INTO users (username, email, password, role)
            VALUES (?, ?, ?, ?);`,
            [username, email, hashedPassword, role]
        )

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
            [
                sqlResult.insertId,
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
            message: 'Registered successfully — ' +
                     'please check your email to confirm'
            ,
            user: {
                id: sqlResult.insertId,
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
        
        const [sqlSelect] = await dbConnection.execute(
            `SELECT
                u.id,
                u.username,
                u.email,
                u.password,
                u.role,
                u.email_pending, 
                ut.token_value AS email_change_token, 
                ut.expires_at AS token_expires
            FROM users u
            LEFT JOIN user_tokens ut 
                ON u.id = ut.user_id AND ut.token_type = 'email_change'
            WHERE u.id = ?`, [id]
        )

        if (sqlSelect.length === 0) {
            return response.status(404).json({ message: 'User not found' })
        }
        
        const updatedUsername = username ?? sqlSelect[0].username
        let updatedPassword = sqlSelect[0].password
        const updatedRole = role ?? sqlSelect[0].role
        let emailChangeToken = sqlSelect[0].email_change_token
        let tokenExpires = sqlSelect[0].token_expires
        let emailPending = sqlSelect[0].email_pending

        if (email !== sqlSelect[0].email) {
            emailChangeToken = crypto.randomBytes(32).toString('hex')
            tokenExpires = new Date(Date.now() + 60 * 60 * 1000)
            emailPending = email
            
            await dbConnection.execute(
                `INSERT INTO user_tokens 
                    (user_id, token_type, token_value, expires_at)
                VALUES 
                    (?, 'email_change', ?, ?)
                ON DUPLICATE KEY UPDATE
                    token_value = VALUES(token_value),
                    expires_at = VALUES(expires_at),
                    created_at = CURRENT_TIMESTAMP,
                    used_at = NULL;`,
                [id, emailChangeToken, tokenExpires]
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

        if (typeof password === 'string' && password.trim() !== '') {
            const salt = await bcryptjs.genSalt(10)
            updatedPassword = await bcryptjs.hash(password, salt)
        }

        const usernameChanged = updatedUsername !== sqlSelect[0].username
        const passwordChanged =
            typeof password === 'string' && password.trim() !== ''
        const emailChanged = email !== sqlSelect[0].email
        const roleChanged = updatedRole !== sqlSelect[0].role
        
        if (
            !usernameChanged &&
            !passwordChanged &&
            !emailChanged &&
            !roleChanged
        ) {
            return response.status(400).json({ message: 'No changes detected' })
        }        
        
        let updateQuery = 'UPDATE users SET'
        const updateValues = []
        
        if (usernameChanged) {
            updateQuery += ' username = ?,'
            updateValues.push(updatedUsername)
        }

        if (emailChanged) {
            updateQuery += ' email_pending = ?,'
            updateValues.push(emailPending)
        }

        if (passwordChanged) {
            updateQuery += ' password = ?,'
            updateValues.push(updatedPassword)
        }

        if (roleChanged) {
            updateQuery += ' role = ?,'
            updateValues.push(updatedRole)
        }

        updateQuery = updateQuery.slice(0, -1) + ' WHERE id = ?;'
        updateValues.push(id)

        await dbConnection.execute(updateQuery, updateValues)

        let mainSuccessMessage = 'User updated successfully'
        const successfulUpdates = []

        if (usernameChanged) {
            successfulUpdates.push('Username updated successfully')
        }

        if (emailChanged) {
            mainSuccessMessage = mainSuccessMessage.concat(
                ' — check email to confirm email change'
            )
            successfulUpdates.push(
                'Email address update pending email confirmation'
            )
        }

        if (passwordChanged) {
            successfulUpdates.push('Password updated successfully')
        }

        if (roleChanged) {
            successfulUpdates.push('Role updated successfully')
        }

        return response.status(200).json({
            message: mainSuccessMessage,
            successfulUpdates,
            user: {
                id,
                username: updatedUsername,
                email: sqlSelect[0].email,
                role: updatedRole
            }
        })
    } catch (error) {
        return handleDbError(response, error)
    }    
}

const deleteUser = async (request, response) => {
    const { token } = request.query

    try {
        const [sqlResult] = await dbConnection.execute(
            `SELECT u.id, ut.expires_at
            FROM users u
            JOIN user_tokens ut
                ON ut.user_id = u.id
            WHERE ut.token_type = 'account_deletion'
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
            `UPDATE user_tokens
            SET used_at = CURRENT_TIMESTAMP
            WHERE token_value = ?
                AND token_type = 'account_deletion';`,
            [token]
        )

        await dbConnection.execute(
            'DELETE FROM users WHERE id = ?;',
            [userAndTokenInfo.id]
        )

        return response.status(200).json({
            message: 'Account deleted successfully'
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
    deleteUser
}
