import bcryptjs from 'bcryptjs'
import jsonwebtoken from 'jsonwebtoken'
import dbConnection from '../database/database.js'
import handleDbError from '../utilities/handleDbError.js'

const jwtSecret = process.env.JWT_SECRET

if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined in environment variables')
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
                message: 'Invalid email and/or password'
            })
        }

        const passwordMatch = await bcryptjs.compare(password, user.password)

        if (!passwordMatch) {
            return response.status(401).json({
                message: 'Invalid email and/or password'
            })
        }

        delete user.password

        const accessToken = jsonwebtoken.sign(
            { user },
            jwtSecret,
            { expiresIn: '1h' }
        )

        return response.status(200).json({ accessToken, user })
    } catch (error) {
        return handleDbError(response, error)
    }
}

export default {
    createSession
}
