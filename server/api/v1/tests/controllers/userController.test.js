import bcryptjs from 'bcryptjs'
import crypto from 'crypto'
import userController from '../../controllers/userController.js'
import dbConnection from '../../db/dbConnection.js'
import handleDbError from '../../util/handleDbError.js'
import validateUser from '../../util/validateUser.js'
import validateSession from '../../util/validateSession.js'
import emailTransporter from '../../util/emailTransporter.js'

jest.mock('bcryptjs')
jest.mock('crypto')
jest.mock('../../db/dbConnection.js')
jest.mock('../../util/handleDbError.js')
jest.mock('../../util/validateUser.js')
jest.mock('../../util/validateSession.js')
jest.mock('../../util/emailTransporter.js')
jest.mock('nodemailer', () => ({
    createTransport: jest.fn(() => ({
        sendMail: jest.fn().mockResolvedValue('Email sent successfully')
    }))
}))

describe('userController', () => {
    const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    }

    beforeEach(() => { jest.clearAllMocks() })
    beforeAll(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {})
    })
    afterAll(() => { console.error.mockRestore() })

    describe('readUsers', () => {
        it('should return all users and status code 200', async () => {
            const mockRequest = {}
            const mockUsers = [
                { id: 1, username: 'user1' },
                { id: 2, username: 'user2' }
            ]

            dbConnection.execute.mockResolvedValue([mockUsers])
            await userController.readUsers(mockRequest, mockResponse)

            expect(dbConnection.execute).toHaveBeenCalledWith(
                'SELECT * FROM users;'
            )
            expect(mockResponse.status).toHaveBeenCalledWith(200)
            expect(mockResponse.json).toHaveBeenCalledWith(mockUsers)
        })
        
        it('should handle errors using handleDbError', async () => {
            const mockRequest = {}
            const mockError = new Error('Database failure')

            dbConnection.execute.mockRejectedValue(mockError)
            await userController.readUsers(mockRequest, mockResponse)

            expect(handleDbError).toHaveBeenCalledWith(mockResponse, mockError)
        })
    })

    describe('readUser', () => {
        it('should return the requested user and status code 200', async () => {
            const mockRequest = { params: { id: 1 } }
            const mockUser = { id: 1, username: 'user1' }

            dbConnection.execute.mockResolvedValue([[mockUser]])
            await userController.readUser(mockRequest, mockResponse)

            expect(dbConnection.execute).toHaveBeenCalledWith(
                'SELECT * FROM users WHERE id = ?;',
                [1]
            )
            expect(mockResponse.status).toHaveBeenCalledWith(200)
            expect(mockResponse.json).toHaveBeenCalledWith(mockUser)
        })

        it('should handle errors using handleDbError', async () => {
            const mockRequest = { params: { id: 1 } }
            const mockError = new Error('DB error')

            dbConnection.execute.mockRejectedValue(mockError)
            await userController.readUser(mockRequest, mockResponse)

            expect(handleDbError).toHaveBeenCalledWith(mockResponse, mockError)
        })
    })

    describe('createUser', () => {
        it('should create user, send confirmation email and' +
            'return stats code 201', async () => {
            const mockRequest = {
                body: {
                    username: 'newuser',
                    email: 'newuser@example.com',
                    password: 'Password&123456789',
                    reEnteredPassword: 'Password&123456789'
                }
            }
            const mockSqlInsert = { insertId: 6 }

            dbConnection.execute =
                jest.fn().mockResolvedValue([mockSqlInsert])
            bcryptjs.genSalt = jest.fn().mockResolvedValue('salt')
            bcryptjs.hash = jest.fn().mockResolvedValue('hashedPassword')
            crypto.randomBytes =
                jest.fn().mockReturnValue(Buffer.from('randomToken'))
            validateUser.validateUsername.mockResolvedValue({ valid: true })
            validateUser.validateEmail.mockResolvedValue({ valid: true })
            validateUser.validatePassword.mockResolvedValue({ valid: true })
            validateUser.checkForChanges.mockResolvedValue({ valid: true })
            await userController.createUser(mockRequest, mockResponse)

            expect(emailTransporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: process.env.EMAIL_USER,
                    to: 'newuser@example.com',
                    subject: expect.stringContaining('confirm your email'),
                    html: expect.any(String)
                })
            )
            expect(mockResponse.status).toHaveBeenCalledWith(201)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Registered successfully — ' +
                         'please check your email to confirm'
            })
        })

        it('should handle errors using handleDbError', async () => {
            const mockRequest = {
                body: {
                    username: 'newuser',
                    email: 'newuser@example.com',
                    password: 'Password&123456789',
                    reEnteredPassword: 'Password&123456789'
                }
            }
            const mockError = new Error('Insert failed')

            dbConnection.execute.mockRejectedValue(mockError)
            await userController.createUser(mockRequest, mockResponse)

            expect(handleDbError).toHaveBeenCalledWith(mockResponse, mockError)
        })        
    })

    describe('updateUser', () => {
        it('should send an email for email change ' +
            'and update user', async () => {
            const request = {
                params: { id: 1 },
                body: {
                    username: 'newusername',
                    email: 'newemail@example.com',
                    password: 'NewPassword&123456789',
                    role: 'admin'
                }
            }
            const mockDbResult = [
                { 
                    id: 1, 
                    username: 'oldusername', 
                    email: 'oldemail@example.com', 
                    password: 'oldpassword', 
                    role: 'user', 
                    email_pending: null, 
                    email_change_token: null, 
                    token_expires: null 
                }
            ]
            const mockSendMail =
                jest.fn().mockResolvedValue('Email sent successfully')

            emailTransporter.sendMail = mockSendMail
            dbConnection.execute.mockResolvedValue([mockDbResult])
            await userController.updateUser(request, mockResponse)

            expect(mockResponse.status).toHaveBeenCalledWith(200)
            expect(mockResponse.json)
                .toHaveBeenCalledWith(expect.objectContaining({
                    message: 'User updated successfully — ' +
                            'check email to confirm email change',
                    successfulUpdates: expect.arrayContaining([
                        'Username updated successfully',
                        'Email address update pending email confirmation'
                    ]),
                    user: expect.objectContaining({
                        id: 1,
                        username: 'newusername',
                        email: 'oldemail@example.com',
                        role: 'admin'
                    })
                }))
            expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
                from: process.env.EMAIL_USER,
                to: 'newemail@example.com',
                subject: expect.stringContaining('email address change for'),
                html: expect.any(String)
            }))
        })

        it('should handle errors using handleDbError', async () => {
            const mockRequest = {
                body: {
                    username: 'newuser',
                    email: 'newuser@example.com',
                    password: 'Password&123456789',
                    reEnteredPassword: 'Password&123456789'
                }
            }
            const mockError = new Error('Insert failed')

            dbConnection.execute.mockRejectedValue(mockError)
            await userController.createUser(mockRequest, mockResponse)

            expect(handleDbError).toHaveBeenCalledWith(mockResponse, mockError)
        })  
    })

    describe('deleteUser', () => {
        it('should delete the user and return status code 200', async () => {
            const mockRequest = { query: { token: 'valid-token' } }
            const sqlSelectResult = [{
                id: 23,
                expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
            }]

            dbConnection.execute
                .mockResolvedValueOnce([sqlSelectResult])
                .mockResolvedValueOnce([{}])
                .mockResolvedValueOnce([{}])
            await userController.deleteUser(mockRequest, mockResponse)

            expect(dbConnection.execute).toHaveBeenCalledWith(
                expect.stringContaining('SELECT u.id'),
                ['valid-token']
            )
            expect(dbConnection.execute).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE user_tokens'),
                ['valid-token']
            )
            expect(dbConnection.execute).toHaveBeenCalledWith(
                'DELETE FROM users WHERE id = ?;',
                [23]
            )
            expect(mockResponse.status).toHaveBeenCalledWith(200)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Account deleted successfully'
            })
        })

        it('should handle errors using handleDbError', async () => {
            const mockRequest = { params: { id: 1 } }
            const mockError = new Error('DB error')

            dbConnection.execute.mockRejectedValue(mockError)
            await userController.readUser(mockRequest, mockResponse)

            expect(handleDbError).toHaveBeenCalledWith(mockResponse, mockError)
        })
    })
})
