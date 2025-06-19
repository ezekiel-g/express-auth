
import { describe, it, expect, beforeEach, afterEach, jest }
    from '@jest/globals'
import validateUser from '../../util/validateUser.js'
import validationHelper from '../../util/validationHelper.js'

jest.mock('../../util/validationHelper.js')

describe('validateUser', () => {
    const requestBody = {
        username: 'User1',
        email: 'user1@example.com',
        password: 'Password&123456789',
        reEnteredPassword: 'Password&123456789'
    }

    const existingUsers = [
        {
            id: 1,
            username: 'User1',
            email: 'user1@example.com',
            password: 'Password&123456789',
            role: 'admin'
        },
        {
            id: 2,
            username: 'User2',
            email: 'user2@example.com',
            password: 'Password&987654321',
            role: 'user'
        }
    ]

    const message = 'Validation failed'
    let request
    let response

    beforeEach(() => {
        request = { body: Object.assign({}, requestBody) }
        response = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        }
        validationHelper.checkForDuplicate.mockResolvedValue('pass')
        validationHelper.returnSuccess
            .mockReturnValue({ valid: true, message: '' })
        jest.spyOn(validationHelper, 'getUsers')
            .mockResolvedValue(existingUsers)
    })

    afterEach(() => { jest.clearAllMocks() })

    it('returns validation error for empty username', async () => {
        request.body.username = ''

        await validateUser(request, response)
        expect(response.json).toHaveBeenCalledWith({
            message,
            validationErrors: ['Username required']
        })
    })

    it('returns validation error for invalid username format', async () => {
        request.body.username = 'User&'

        await validateUser(request, response)
        expect(response.json).toHaveBeenCalledWith({
            message,
            validationErrors:
                expect.arrayContaining([expect.stringContaining('must be')])
        })
    })

    it('returns validation error for empty email', async () => {
        request.body.email = ''

        await validateUser(request, response)
        expect(response.json).toHaveBeenCalledWith({
            message,
            validationErrors: ['Email address required']
        })
    })

    it('returns validation error for invalid email format', async () => {
        request.body.email = 'user1&example.com'

        await validateUser(request, response)
        expect(response.json).toHaveBeenCalledWith({
            message,
            validationErrors:
                expect.arrayContaining([expect.stringContaining('must contai')])
        })
    })

    it('returns validation error for duplicates', async () => {
        validationHelper.checkForDuplicate.mockResolvedValue('fail')
        
        await validateUser(request, response)
        expect(response.json).toHaveBeenCalledWith({
            message,
            validationErrors:
                expect.arrayContaining([expect.stringContaining('taken')])
        })
    })

    it('returns validation error for invalid password format', async () => {
        request.body.password = 'badpassword'

        await validateUser(request, response)
        expect(response.json).toHaveBeenCalledWith({
            message,
            validationErrors:
                expect.arrayContaining([expect.stringContaining('must be')])
        })
    })

    it('returns validation error if password not re-entered', async () => {
        request.body.reEnteredPassword = ''
        
        await validateUser(request, response)
        expect(response.json).toHaveBeenCalledWith({
            message,
            validationErrors: ['Passwords must match']
        })
    })

    it('returns validation error for invalid role', async () => {
        request.body.role = 'notarole'

        await validateUser(request, response)
        expect(response.json).toHaveBeenCalledWith({
            message,
            validationErrors:
                expect.arrayContaining([expect.stringContaining('must be')])
        })
    })

    it('returns error when no changes are detected', async () => {
        await validateUser(request, response, 1)
        expect(response.json).toHaveBeenCalledWith({
            message,
            validationErrors: ['No changes detected']
        })
    })

    it('returns { valid: true } if no validation errors', async () => {
        const validationResult = await validateUser(request, response)

        expect(validationResult.valid).toBe(true)
    })
})
