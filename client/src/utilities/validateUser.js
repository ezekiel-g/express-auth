const validateEmployee = {
    validateUsername: username => {
        if (!username) {
            return { valid: false, message: 'Username is required' }
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
        return { valid: true, message: '' }
    },

    validateEmail: email => {
        if (!email) {
            return { valid: false, message: 'Email address is required' }
        }
        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
        if (!emailRegex.test(email)) {
            return {
                valid: false,
                message: `
                    Email address must contain only letters, numbers, periods,
                    underscores, hyphens, plus signs and percent signs before
                    the "@", a domain name after the "@" and a valid domain
                    extension (e.g., ".com", ".net", ".org") of at least two
                    letters
                `
            }
        }
        return { valid: true, message: '' }
    },

    validatePassword: password => {
        if (!password) {
            return { valid: false, message: 'Password is required' }
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
        return { valid: true, message: '' }
    }
}

export default validateEmployee