import bcryptjs from 'bcryptjs'
import dbConnection from '../db/dbConnection.js'
import checkForDuplicate from './checkForDuplicate.js'

const getUsers = async () => {
    try {
        const [sqlResult] = await dbConnection.execute('SELECT * FROM users;')
        return sqlResult
    } catch (error) {
        console.error('Error:', error.message)
        return []
    }
}

const validateUser = {
    validateUsername: async (username, excludeId = null) => {
        if (!username || username.trim() === '') {
            return { valid: false, message: 'Username required' }
        }

        const usernameRegex = /^[a-zA-Z_][a-zA-Z0-9._]{2,19}$/

        if (!usernameRegex.test(username)) {
            return {
                valid: false,
                message:
                    'Username must be between 3 and 20 characters, start ' +
                    'with a letter or an underscore and contain only ' +
                    'letters, numbers periods and underscores'

            }
        }

        const duplicateCheck = await checkForDuplicate(
            { username },
            getUsers,
            Number(excludeId)
        )

        if (duplicateCheck !== 'pass') {
            return { valid: false, message: 'Username taken' }
        }

        return { valid: true, message: '' }
    },

    validateEmail: async (
        email,
        excludeId = null,
        skipDuplicateCheck = null
    ) => {
        if (!email || email.trim() === '') {
            return { valid: false, message: 'Email address required' }
        }

        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
        
        if (!emailRegex.test(email)) {
            return {
                valid: false,
                message:
                    'Email address must contain only letters, numbers, ' +
                    'periods, underscores, hyphens, plus signs and percent ' +
                    'signs before the "@", a domain name after the "@", and ' +
                    'a valid domain extension (e.g. ".com", ".net", ".org") ' +
                    'of at least two letters'
            }
        }

        if (skipDuplicateCheck !== 'skipDuplicateCheck') {
            const duplicateCheck = await checkForDuplicate(
                { email },
                getUsers,
                Number(excludeId)
            )

            if (duplicateCheck !== 'pass') {
                return { valid: false, message: 'Email address taken' }
            }
        }
        return { valid: true, message: '' }
    },

    validatePassword: async (password, userId = null) => {
        if (!password) {
            return { valid: false, message: 'Password required' }
        }

        const passwordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{16,}$/
        
        if (!passwordRegex.test(password)) {
            return {
                valid: false,
                message:
                    'Password must be at least 16 characters and include at ' +
                    'least one lowercase letter, one capital letter, one ' +
                    'number and one symbol (!@#$%^&*)'
            }
        }

        if (userId) {
            const users = await getUsers()
            const user = users.find(row => row.id === Number(userId))

            if (await bcryptjs.compare(password, user.password)) {
                return {
                    valid: false,
                    message: 'New password same as current password'
                }
            }
        }

        return { valid: true, message: '' }
    },

    checkForChanges: async (entries, userId) => {
        const users = await getUsers()
        const user = users.find(row => row.id === Number(userId))
        const columnNames = Object.keys(entries)
        let changeHappened = false

        for (let i = 0; i < columnNames.length; i++) {
            const rowValue = entries[columnNames[i]]

            if (columnNames[i] === 'password') {
                if (rowValue && rowValue !== '') {
                    const passwordMatch =
                        await bcryptjs.compare(rowValue, user.password)

                    if (passwordMatch) continue

                    changeHappened = true
                }
            } else {
                if (rowValue !== user[columnNames[i]]) {
                    changeHappened = true
                }
            }
        }

        return {
            valid: changeHappened,
            message: changeHappened ? '' : 'No changes detected'
        }
    }
}

export default validateUser
