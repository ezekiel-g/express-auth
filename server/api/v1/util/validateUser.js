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

const validateUser = async (
    entries,
    excludeIdForUpdate = null,
    userIdForPasswordCheck = null,
    skipDuplicateCheck = null
) => {
    const columnNames = Object.keys(entries)
    const validationErrors = []
    let currentUser = null
    let infoChanged = false

    for (let i = 0; i < columnNames.length; i++) {
        const rowValue = entries[columnNames[i]]

        if (columnNames[i] === 'username') {
            if (!rowValue || rowValue.trim() === '') {
                validationErrors.push('Username required')
                continue
            }

            const usernameRegex = /^[a-zA-Z_][a-zA-Z0-9._]{2,19}$/

            if (!usernameRegex.test(rowValue)) {
                validationErrors.push(
                    'Username must be between 3 and 20 characters, start ' +
                    'with a letter or an underscore and contain only ' +
                    'letters, numbers periods and underscores'
                )
                continue
            }
            
            const duplicateCheck = await checkForDuplicate(
                { username: rowValue },
                getUsers,
                Number(excludeIdForUpdate)
            )
            
            if (duplicateCheck !== 'pass') {
                validationErrors.push('Username taken')
                continue
            }
        } else if (columnNames[i] === 'email') {
            if (!rowValue || rowValue.trim() === '') {
                validationErrors.push('Email address required')
                continue
            }

            const emailRegex =
                /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

            if (!emailRegex.test(rowValue)) {
                validationErrors.push(
                    'Email address must contain only letters, numbers, ' +
                    'periods, underscores, hyphens, plus signs and percent ' +
                    'signs before the "@", a domain name after the "@", and ' +
                    'a valid domain extension (e.g. ".com", ".net", ".org") ' +
                    'of at least two letters'
                )
                continue
            }
            if (skipDuplicateCheck !== 'skipDuplicateCheck') {
                const duplicateCheck = await checkForDuplicate(
                    { email: rowValue },
                    getUsers,
                    Number(excludeIdForUpdate)
                )
                
                if (duplicateCheck !== 'pass') {
                    validationErrors.push('Email address taken')
                    continue
                }
            }
        } else if (columnNames[i] === 'password') {
            if (!rowValue) {
                if (excludeIdForUpdate) continue
                validationErrors.push('Password required')
                continue
            }

            const passwordRegex =
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{16,}$/

            if (!passwordRegex.test(rowValue)) {
                validationErrors.push(
                    'Password must be at least 16 characters and include at ' +
                    'least one lowercase letter, one capital letter, one ' +
                    'number and one symbol (!@#$%^&*)'
                )
                continue
            }

            if (userIdForPasswordCheck) {
                const users = await getUsers()
                const user = users.find(
                    row => row.id === Number(userIdForPasswordCheck)
                )

                if (user && await bcryptjs.compare(rowValue, user.password)) {
                    validationErrors.push(
                        'New password same as current password'
                    )
                    continue
                }
            }

        } else if (columnNames[i] === 'reEnteredPassword') {
            if (entries['password'] && (rowValue !== entries['password'])) {
                validationErrors.push('Passwords must match')
                continue
            }
        }
    }

    if (excludeIdForUpdate) {
        const users = await getUsers()
        currentUser = users.find(user => user.id === excludeIdForUpdate)
        
        if (currentUser) {
            for (let i = 0; i < columnNames.length; i++) {
                const rowValue = entries[columnNames[i]]
                const existingValue = currentUser[columnNames[i]]

                if (
                    columnNames[i] === 'password' &&
                    (!rowValue || rowValue.trim() === '')
                ) {
                    continue
                }

                if (columnNames[i] === 'reEnteredPassword') {
                    if (
                        entries['password'] &&
                        rowValue !== entries['password']
                    ) {
                        validationErrors.push('Passwords must match')
                        continue
                    }
                    continue
                }

                if (rowValue !== existingValue) {
                    infoChanged = true
                    break
                }
            }
        }
    }
    
    if (excludeIdForUpdate && !infoChanged) { 
        validationErrors.push('No changes detected') 
    }

    const validationResult = {
        valid: validationErrors.length === 0,
        validationErrors: validationErrors.length === 0 ? '' : validationErrors
    }

    return validationResult
}

export default validateUser
