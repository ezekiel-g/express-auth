import bcryptjs from 'bcryptjs'
import crypto from 'crypto'
import userController from '../../controllers/userController.js'
import dbConnection from '../../db/dbConnection.js'
import handleDbError from '../../util/handleDbError.js'
import validateSession from '../../util/validateSession.js'
import emailTransporter from '../../util/emailTransporter.js'

jest.mock('bcryptjs')
jest.mock('crypto')
jest.mock('../../db/dbConnection.js')
jest.mock('../../util/handleDbError.js')
jest.mock('../../util/validateSession.js')
jest.mock('../../util/emailTransporter.js')
jest.mock('nodemailer', () => ({
    createTransport: jest.fn(() => ({
        sendMail: jest.fn().mockResolvedValue('Email sent successfully')
    }))
}))

describe('userController', () => {
    describe('readUsers', () => {
        const mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        }

        beforeEach(() => { jest.clearAllMocks() })
        beforeAll(() => {
            jest.spyOn(console, 'error').mockImplementation(() => {})
        })
        afterAll(() => { console.error.mockRestore() })

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
        const mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        }

        beforeEach(() => { jest.clearAllMocks() })

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
            const mockRequest = { params: { id: '1' } }
            const mockError = new Error('DB error')

            dbConnection.execute.mockRejectedValue(mockError)
            await userController.readUser(mockRequest, mockResponse)

            expect(handleDbError).toHaveBeenCalledWith(mockResponse, mockError)
        })
    })

    describe('createUser', () => {
        const mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        }

        beforeEach(() => { jest.clearAllMocks() })

        it('should create user and send verification email', async () => {
            const mockRequest = {
                body: {
                    username: 'newuser1',
                    email: 'newuser1@example.com',
                    password: 'password123'
                }
            }

            bcryptjs.genSalt.mockResolvedValue('salt')
            bcryptjs.hash.mockResolvedValue('hashedPassword')
            crypto.randomBytes.mockReturnValue(Buffer.from('token123'))
            emailTransporter.sendMail.mockResolvedValue({})

            dbConnection.execute
                .mockResolvedValueOnce([{ insertId: 6 }])
                .mockResolvedValueOnce([{}])
            await userController.createUser(mockRequest, mockResponse)

            expect(dbConnection.execute).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO users'),
                ['newuser1', 'newuser1@example.com', 'hashedPassword', 'user']
            )
            expect(emailTransporter.sendMail).toHaveBeenCalledWith({
                from: process.env.EMAIL_USER,
                to: 'newuser1@example.com',
                subject: expect.stringContaining('Please confirm your email'),
                html: expect.any(String)
            })
            expect(mockResponse.status).toHaveBeenCalledWith(201)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Registered successfully — ' +
                         'please check your email to confirm',
                user: {
                    id: 6,
                    username: 'newuser1',
                    email: 'newuser1@example.com',
                    role: 'user'
                }
            })
        })

        it('should handle errors using handleDbError', async () => {
            const mockRequest = {
                body: {
                    username: 'newuser1',
                    email: 'newuser1@example.com',
                    password: 'password123'
                }
            }
            const mockError = new Error('Insert failed')

            dbConnection.execute.mockRejectedValue(mockError)
            await userController.createUser(mockRequest, mockResponse)

            expect(handleDbError).toHaveBeenCalledWith(mockResponse, mockError)
        })
    })

    describe('updateUser', () => {
        const mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        }

        beforeEach(() => {
            jest.clearAllMocks()
            validateSession.mockImplementation(() => {})
        })

        it('should update user and return status code 200 ' +
            'and success message', async () => {
            const mockRequest = {
                params: { id: 1 },
                body: {
                    username: 'newuser1',
                    email: 'newuser1@example.com',
                    password: 'newpass123',
                    role: 'user'
                }
            }
            const sqlSelectResult = [{
                id: 1,
                username: 'oldusername',
                email: 'oldemail@example.com',
                password: 'oldhashed',
                role: 'user',
                email_pending: null,
                email_change_token: null,
                token_expires: null
            }]

            dbConnection.execute
                .mockResolvedValueOnce([sqlSelectResult])
                .mockResolvedValueOnce([{}])
                .mockResolvedValueOnce([{ affectedRows: 1 }])
            bcryptjs.genSalt.mockResolvedValue('salt')
            bcryptjs.hash.mockResolvedValue('newpasswordhashed')
            crypto.randomBytes.mockReturnValue(Buffer.from('token123'))
            emailTransporter.sendMail.mockResolvedValue()
            await userController.updateUser(mockRequest, mockResponse)

            expect(validateSession).toHaveBeenCalledWith(mockRequest, 1)
            expect(dbConnection.execute).toHaveBeenNthCalledWith(
                1,
                expect.stringContaining('SELECT'),
                [1]
            )
            expect(crypto.randomBytes).toHaveBeenCalledWith(32)
            expect(dbConnection.execute).toHaveBeenNthCalledWith(
                2,
                expect.stringContaining('INSERT INTO user_tokens'),
                expect.any(Array)
            )
            expect(emailTransporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'newuser1@example.com'
                })
            )
            expect(dbConnection.execute).toHaveBeenNthCalledWith(
                3,
                expect.stringContaining('UPDATE users'),
                expect.any(Array)
            )
            expect(mockResponse.status).toHaveBeenCalledWith(200)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'User updated successfully — ' +
                         'check email to confirm email change',
                user: {
                    id: 1,
                    username: 'newuser1',
                    email: 'oldemail@example.com',
                    role: 'user'
                }
            })
        })

        it('should return 404 if user not found', async () => {
            const mockRequest = {
                params: { id: 700 },
                body: {}
            }

            dbConnection.execute.mockResolvedValueOnce([[]])
            await userController.updateUser(mockRequest, mockResponse)

            expect(mockResponse.status).toHaveBeenCalledWith(404)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'User not found'
            })
        })

        it('should return 404 if no changes detected', async () => {
            const mockRequest = {
                params: { id: 8 },
                body: {
                    username: 'oldusername',
                    email: 'oldemail@example.com',
                    password: undefined,
                    role: 'user'
                }
            }
            const sqlSelectResult = [{
                id: 8,
                username: 'oldusername',
                email: 'oldemail@example.com',
                password: 'oldhashed',
                role: 'user',
                email_pending: null,
                email_change_token: null,
                token_expires: null
            }]

            dbConnection.execute
                .mockResolvedValueOnce([sqlSelectResult])
                .mockResolvedValueOnce([{ affectedRows: 0 }])
            await userController.updateUser(mockRequest, mockResponse)

            expect(mockResponse.status).toHaveBeenCalledWith(404)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'No changes detected'
            })
        })

        it('should handle errors using handleDbError', async () => {
            const mockRequest = {
                params: { id: 5 },
                body: {}
            }
            const mockError = new Error('DB error')

            dbConnection.execute.mockRejectedValue(mockError)
            await userController.updateUser(mockRequest, mockResponse)

            expect(handleDbError).toHaveBeenCalledWith(mockResponse, mockError)
        })
    })

    describe('deleteUser', () => {
        const mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        }

        beforeEach(() => { jest.clearAllMocks() })

        it('should delete the user and return status code 200', async () => {
            const mockRequest = {
                query: { token: 'valid-token' }
            }
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
    })
})
