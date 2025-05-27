import bcryptjs from 'bcryptjs'
import dbConnection from '../../db/dbConnection.js'
import validateUser from '../../util/validateUser.js'
import checkForDuplicate from '../../util/checkForDuplicate.js'

jest.mock('../../db/dbConnection.js', () => ({
    execute: jest.fn()
}))
jest.mock('../../util/checkForDuplicate.js')

describe('validateUser', () => {
    describe('validateUsername', () => {
        it('should return error if username is empty', async () => {
            const result = await validateUser.validateUsername('')
            expect(result.valid).toBe(false)
            expect(result.message).toBe('Username required')
        })

        it('should return error if username is invalid', async () => {
            const result = await validateUser.validateUsername('u')
            expect(result.valid).toBe(false)
            expect(result.message).toBe(
                'Username must be between 3 and 20 characters, start with a ' +
                'letter or an underscore and contain only letters, numbers ' +
                'periods and underscores'
            )
        })

        it('should return error if username is taken', async () => {
            checkForDuplicate.mockResolvedValueOnce('fail')
            const result = await validateUser.validateUsername('existingUser')
            expect(result.valid).toBe(false)
            expect(result.message).toBe('Username taken')
        })

        it('should return success if username is valid', async () => {
            checkForDuplicate.mockResolvedValueOnce('pass')
            const result = await validateUser.validateUsername('newUser')
            expect(result.valid).toBe(true)
            expect(result.message).toBe('')
        })
    })

    describe('validateEmail', () => {
        it('should return error if email is empty', async () => {
            const result = await validateUser.validateEmail('')
            expect(result.valid).toBe(false)
            expect(result.message).toBe('Email address required')
        })

        it('should return error if email is invalid', async () => {
            const result = await validateUser.validateEmail('invalid-email')
            expect(result.valid).toBe(false)
            expect(result.message).toBe(
                'Email address must contain only letters, numbers, periods, ' +
                'underscores, hyphens, plus signs and percent signs before ' +
                'the "@", a domain name after the "@", and a valid domain ' +
                'extension (e.g. ".com", ".net", ".org") of at least two ' +
                'letters'
            )
        })

        it('should return error if email is taken', async () => {
            checkForDuplicate.mockResolvedValueOnce('fail')
            const result = await validateUser.validateEmail('taken@example.com')
            expect(result.valid).toBe(false)
            expect(result.message).toBe('Email address taken')
        })

        it('should return success if email is valid', async () => {
            checkForDuplicate.mockResolvedValueOnce('pass')
            const result = await validateUser.validateEmail('new@example.com')
            expect(result.valid).toBe(true)
            expect(result.message).toBe('')
        })
    })

    describe('validatePassword', () => {
        it('should return error if password is empty', async () => {
            const result = await validateUser.validatePassword('')
            expect(result.valid).toBe(false)
            expect(result.message).toBe('Password required')
        })

        it('should return error if password ' +
            'does not meet criteria', async () => {
            const result = await validateUser.validatePassword('short')
            expect(result.valid).toBe(false)
            expect(result.message).toBe(
                'Password must be at least 16 characters and include at ' +
                'least one lowercase letter, one capital letter, one number ' +
                'and one symbol (!@#$%^&*)'
            )
        })

        it('should return error if password is same as ' +
            'current password', async () => {
            const users = [{ id: 1, password: 'hashedOldPassword' }]
            dbConnection.execute.mockResolvedValueOnce([users])

            bcryptjs.compare = jest.fn().mockResolvedValue(true)

            const result =
                await validateUser.validatePassword('OldPassword&123456789', 1)
            expect(result.valid).toBe(false)
            expect(result.message).toBe('New password same as current password')
        })

        it('should return success if password is valid ' +
            'and different from current password', async () => {
            const users = [{ id: 1, password: 'hashedOldPassword' }]
            dbConnection.execute.mockResolvedValueOnce([users])

            bcryptjs.compare = jest.fn().mockResolvedValue(false)

            const result =
                await validateUser.validatePassword('NewPassword&123456789', 1)
            expect(result.valid).toBe(true)
            expect(result.message).toBe('')
        })
    })

    describe('checkForChanges', () => {
        it('should return error if no changes are detected', async () => {
            const users = [{
                id: 1,
                username: 'oldUser',
                email: 'old@example.com',
                password: 'hashedPassword'
            }]
            dbConnection.execute.mockResolvedValueOnce([users])

            const entries = {
                username: 'oldUser',
                email: 'old@example.com',
                password: ''
            }
            const result = await validateUser.checkForChanges(entries, 1)

            expect(result.valid).toBe(false)
            expect(result.message).toBe('No changes detected')
        })

        it('should return success if changes are detected', async () => {
            const users = [{
                id: 1,
                username: 'oldUser',
                email: 'old@example.com',
                password: 'hashedPassword'
            }]
            dbConnection.execute.mockResolvedValueOnce([users])

            const entries = {
                username: 'newUser',
                email: 'new@example.com',
                password: 'newPassword123!'
            }
            const result = await validateUser.checkForChanges(entries, 1)

            expect(result.valid).toBe(true)
            expect(result.message).toBe('')
        })
    })
})
