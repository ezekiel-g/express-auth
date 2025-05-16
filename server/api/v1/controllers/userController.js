import bcryptjs from 'bcryptjs'
import dbConnection from '../database/database.js'
import handleDbError from '../utilities/handleDbError.js'
import validateSession from '../utilities/validateSession.js'
// import checkForDuplicates from '../utilities/checkForDuplicates.js'

const queries = {
    readUsers: 'SELECT * FROM users;',
    readUser: 'SELECT * FROM users WHERE id = ?;',
    readUserUsername: 'SELECT id FROM users WHERE username = ?;',
    readUserEmail: 'SELECT id FROM users WHERE email = ?;',
    createUser: `
        INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?);
    `,
    updateUser: `
        UPDATE users
        SET username = ?, email = ?, password = ?, role = ?
        WHERE id = ?;
    `,
    deleteUser: 'DELETE FROM users WHERE id = ?;'
    
}
const jwtSecret = process.env.JWT_SECRET

if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined in environment variables')
}

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
    
    if (!role) { role = 'user' }

    try {
        // // There is already validation for dupliate values both
        // // on the front end and from the database, but there is optional
        // // duplicate values validation here

        // const duplicateCheck = await checkForDuplicates(
        //     response,
        //     { username, email }
        // )
        
        // if (duplicateCheck !== 'pass') return

        const salt = await bcryptjs.genSalt(10)
        const hashedPassword = await bcryptjs.hash(password, salt)
        const [result] = await dbConnection.execute(
            queries.createUser,
            [username, email, hashedPassword, role]
        )

        return response.status(201).json({
            message: 'User registered successfully',
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
        const updatedEmail = email ?? oldDetails[0].email
        let updatedPassword = password ?? oldDetails[0].password
        const updatedRole = role ?? oldDetails[0].role

        // // There is already validation for dupliate values both
        // // on the front end and from the database, but there is optional
        // // duplicate values validation here

        // const duplicateCheck = await checkForDuplicates(
        //     response,
        //     { username, email },
        //     id
        // )
        // if (duplicateCheck !== 'pass') return

        if (password) {
            const salt = await bcryptjs.genSalt(10)
            updatedPassword = await bcryptjs.hash(updatedPassword, salt)
        }

        const [result] = await dbConnection.execute(
            queries.updateUser,
            [updatedUsername, updatedEmail, updatedPassword, updatedRole, id]
        )

        if (result.affectedRows === 0) {
            return response.status(404).json({ message: 'No changes detected' })
        }

        return response.status(200).json({
            message: 'User updated successfully',
            user: {
                id,
                username: updatedUsername,
                email: updatedEmail,
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

const verifyPassword = async (request, response) => {
    const { id } = request.params
    const { password } = request.body

    try {
        validateSession(request, id)

        const [rows] = await dbConnection.execute(queries.readUser, [id])

        if (rows.length === 0) {
            return response.status(404).json({ message: 'User not found' })
        }

        const user = rows[0]
        const isPasswordValid = await bcryptjs.compare(password, user.password)

        if (!isPasswordValid) {
            return response.status(401).json({ message: 'Invalid password' })
        }

        return response.status(200).json({
            message: 'Password verified successfully'
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
    verifyPassword
}
