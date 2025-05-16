import bcryptjs from 'bcryptjs'
import checkForDuplicate from './checkForDuplicate.js'

const backEndUrl = import.meta.env.VITE_BACK_END_URL

const getUsers = async () => {
    let data = null
    try {
        const response = await fetch(`${backEndUrl}/api/v1/users`)
        if (response.ok) {
            data = await response.json()
        } else {
            console.error(`Fetch error: ${response.statusText}`)
        }
    } catch (error) {
        console.error(`Error: ${error.message}`)
    }
    return data
}

const validateUser = {
    validateUsername: async (username, excludeId = null) => {
        if (!username) {
            return { valid: false, message: 'Username required' }
        }
        const usernameRegex = /^[a-zA-Z_][a-zA-Z0-9._]{2,19}$/
        if (!usernameRegex.test(username)) {
            return {
                valid: false,
                message: `
                    Username must be between 3 and 20 characters, start with a
                    letter or an underscore and contain only letters, numbers,
                    periods and underscores
                `
            }
        }
        
        const duplicateCheck = await checkForDuplicate(
            { username },
            getUsers,
            excludeId
        )
        
        if (duplicateCheck !== 'pass') {
            return { valid: false, message: 'Username taken' }
        }
        return { valid: true, message: '' }
    },

    validateEmail: async (email, excludeId = null) => {
        if (!email) {
            return { valid: false, message: 'Email address required' }
        }
        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
        if (!emailRegex.test(email)) {
            return {
                valid: false,
                message: `
                    Email address must contain only letters, numbers, periods,
                    underscores, hyphens, plus signs and percent signs before
                    the "@", a domain name after the "@" and a valid domain
                    extension (e.g. ".com", ".net", ".org") of at least two
                    letters
                `
            }
        }
        const duplicateCheck = await checkForDuplicate(
            { email },
            getUsers,
            excludeId
        )
        if (duplicateCheck !== 'pass') {
            return { valid: false, message: 'Email address taken' }
        }
        return { valid: true, message: '' }
    },

    validatePassword: async (password, userId) => {
        if (!password) {
            return { valid: false, message: 'Password required' }
        }
        const passwordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{16,}$/
        if (!passwordRegex.test(password)) {
            return {
                valid: false,
                message: `
                    Password must be at least 16 characters and include at least
                    one lowercase letter, one capital letter, one number and one
                    symbol (!@#$%^&*)
                `
            }
        }
        if (userId) {
            const users = await getUsers()
            const user = users.find(row => row.id === userId)
            if (user && await bcryptjs.compare(password, user.password)) {
                return {
                    valid: false,
                    message: 'New password same as current password'
                }
            }
        }
        return { valid: true, message: '' }
    }
}

export default validateUser
