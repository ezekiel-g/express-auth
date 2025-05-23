import bcryptjs from 'bcryptjs'
import jsonwebtoken from 'jsonwebtoken'
import { authenticator } from 'otplib'
import sessionController from '../../controllers/sessionController.js'
import dbConnection from '../../db/dbConnection.js'
import validateSession from '../../util/validateSession.js'
import encryptionUtility from '../../util/encryptionUtility.js'

jest.mock('bcryptjs')
jest.mock('jsonwebtoken')
jest.mock('otplib', () => ({
    authenticator: {
        generate: jest.fn(),
        verify: jest.fn()
    }
}))
jest.mock('../../db/dbConnection.js')
jest.mock('../../util/validateSession.js')
jest.mock('../../util/encryptionUtility.js')

describe('sessionController', () => {
    const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        clearCookie: jest.fn(),
        cookie: jest.fn()
    }

    beforeEach(() => { jest.clearAllMocks() })
    beforeAll(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {})
    })
    afterAll(() => { console.error.mockRestore() })

    describe('readSession', () => {
        it('should return user if session is valid', async () => {
            const mockRequest = {}
            const mockUser = {
                id: 1,
                username: 'user1',
                email: 'user1@example.com',
                role: 'user',
                totp_auth_on: false
            }

            validateSession.mockReturnValue({ id: 1 })
            dbConnection.execute.mockResolvedValue([[mockUser]])

            await sessionController.readSession(mockRequest, mockResponse)
            expect(dbConnection.execute).toHaveBeenCalledWith(
                expect.stringContaining('SELECT id'),
                [1]
            )
            expect(mockResponse.status).toHaveBeenCalledWith(200)
            expect(mockResponse.json).toHaveBeenCalledWith({ user: mockUser })
        })

        it('should return null if session is invalid', async () => {
            const mockRequest = {}

            validateSession.mockReturnValue(null)
            await sessionController.readSession(mockRequest, mockResponse)

            expect(mockResponse.status).toHaveBeenCalledWith(200)
            expect(mockResponse.json).toHaveBeenCalledWith({ user: null })
        })

        it('should return null if user not found', async () => {
            const mockRequest = {}

            validateSession.mockReturnValue({ id: 2 })
            dbConnection.execute.mockResolvedValue([[]])
            await sessionController.readSession(mockRequest, mockResponse)

            expect(mockResponse.status).toHaveBeenCalledWith(200)
            expect(mockResponse.json).toHaveBeenCalledWith({ user: null })
        })

        it('should return 500 on unexpected error', async () => {
            const mockRequest = {}

            validateSession.mockImplementation(() => {
                throw new Error('test error')
            })
            await sessionController.readSession(mockRequest, mockResponse)

            expect(mockResponse.status).toHaveBeenCalledWith(500)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Internal server error'
            })
        })
    })

    describe('createSession', () => {
        it('should sign in successfully and set tokens' +
            'when credentials are valid', async () => {
            const testUser = {
                id: 42,
                username: 'user42',
                email: 'user42@example.com',
                password: 'hashedpassword',
                role: 'user',
                account_verified: true,
                totp_auth_on: false
            }
            const mockRequest = {
                body: {
                    email: testUser.email,
                    password: 'plaintextpassword'
                },
                cookies: {}
            }

            dbConnection.execute.mockResolvedValue([[
                Object.assign({}, testUser)
            ]])
            bcryptjs.compare.mockResolvedValue(true)
            jsonwebtoken.sign.mockImplementation(
                userInfo => `token-${userInfo.id}`
            )
            await sessionController.createSession(mockRequest, mockResponse)

            expect(dbConnection.execute).toHaveBeenCalledWith(
                expect.stringContaining('SELECT'),
                [testUser.email]
            )
            expect(bcryptjs.compare).toHaveBeenCalledWith(
                'plaintextpassword',
                testUser.password
            )
            expect(jsonwebtoken.sign).toHaveBeenCalledTimes(2)

            expect(mockResponse.status).toHaveBeenCalledWith(200)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Signed in successfully',
                user: {
                    id: testUser.id,
                    username: testUser.username,
                    email: testUser.email,
                    role: testUser.role,
                    account_verified: true,
                    totp_auth_on: false
                }
            })

            expect(mockResponse.cookie).toHaveBeenCalledTimes(2)
        })

        it('should respond with 401 if user not found', async () => {
            const mockRequest = {
                body: { email: 'nouser@example.com', password: 'any' }
            }

            dbConnection.execute.mockResolvedValue([[]])

            await sessionController.createSession(mockRequest, mockResponse)

            expect(mockResponse.status).toHaveBeenCalledWith(401)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Invalid credentials'
            })
        })

        it('should respond with 401 if password does not match', async () => {
            const testUser = {
                id: 42,
                username: 'user42',
                email: 'user42@example.com',
                password: 'hashedpassword'
            }
            const mockRequest = {
                body: { email: testUser.email, password: 'wrongpassword' }
            }

            dbConnection.execute.mockResolvedValue([[
                Object.assign({}, testUser)
            ]])
            bcryptjs.compare.mockResolvedValue(false)

            await sessionController.createSession(mockRequest, mockResponse)

            expect(mockResponse.status).toHaveBeenCalledWith(401)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Invalid credentials'
            })
        })

        it('should respond with 403 if account not verified', async () => {
            const testUser = {
                id: 42,
                username: 'user42',
                email: 'user42@example.com',
                password: 'hashedpassword',
                account_verified: false
            }
            const mockRequest = {
                body: { email: testUser.email, password: 'plaintextpassword' }
            }

            dbConnection.execute.mockResolvedValue([[
                Object.assign({}, testUser)
            ]])
            bcryptjs.compare.mockResolvedValue(true)

            await sessionController.createSession(mockRequest, mockResponse)

            expect(mockResponse.status).toHaveBeenCalledWith(403)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Please verify your email address before signing in'
            })
        })

        it('should respond with TOTP prompt ' +
            'if totp_auth_on is true', async () => {
            const testUser = {
                id: 42,
                username: 'user42',
                email: 'user42@example.com',
                password: 'hashedpassword',
                account_verified: true,
                totp_auth_on: true
            }
            const mockRequest = {
                body: { email: testUser.email, password: 'plaintextpassword' }
            }

            dbConnection.execute.mockResolvedValue([[
                Object.assign({}, testUser)
            ]])
            bcryptjs.compare.mockResolvedValue(true)

            await sessionController.createSession(mockRequest, mockResponse)

            expect(mockResponse.status).toHaveBeenCalledWith(200)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Please provide your TOTP code',
                requireTotp: true,
                userId: testUser.id
            })
        })

        it('should respond with 500 on unexpected error', async () => {
            const mockRequest = {
                body: { email: 'any@example.com', password: 'any' }
            }

            dbConnection.execute.mockRejectedValue(new Error('DB failure'))

            await sessionController.createSession(mockRequest, mockResponse)

            expect(mockResponse.status).toHaveBeenCalledWith(500)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Internal server error'
            })
        })
    })

    describe('deleteSession', () => {
        it('should clear accessToken and refreshToken cookies ' +
            'and respond with 200', () => {
            const mockRequest = {}

            sessionController.deleteSession(mockRequest, mockResponse)

            expect(mockResponse.clearCookie).toHaveBeenCalledWith(
                'accessToken',
                {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'Strict'
                }
            )
            expect(mockResponse.clearCookie).toHaveBeenCalledWith(
                'refreshToken',
                {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'Strict'
                }
            )
            expect(mockResponse.status).toHaveBeenCalledWith(200)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Signed out successfully'
            })
        })
    })

    describe('refreshSession', () => {
        it('should respond with 401 if no refresh token cookie ' +
            'is provided', async () => {
            const mockRequest = { cookies: {} }
            await sessionController.refreshSession(mockRequest, mockResponse)

            expect(mockResponse.status).toHaveBeenCalledWith(401)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Refresh token not found'
            })
        })

        it('should respond with 200 and set new access token cookie ' +
            'when refresh token is valid', async () => {
            const decryptedToken = { id: 42 }
            const accessToken = 'accessToken123'

            const mockRequest = {
                cookies: { refreshToken: 'validRefreshToken' }
            }

            jsonwebtoken.verify.mockReturnValue(decryptedToken)
            jsonwebtoken.sign.mockReturnValue(accessToken)

            await sessionController.refreshSession(mockRequest, mockResponse)

            expect(jsonwebtoken.verify).toHaveBeenCalledWith(
                'validRefreshToken',
                expect.any(String)
            )
            expect(jsonwebtoken.sign).toHaveBeenCalledWith(
                { id: decryptedToken.id },
                expect.any(String),
                { expiresIn: '1h' }
            )
            expect(mockResponse.cookie).toHaveBeenCalledWith(
                'accessToken',
                accessToken,
                expect.objectContaining({
                    httpOnly: true,
                    secure: expect.any(Boolean),
                    maxAge: 3600000,
                    sameSite: 'Strict'
                })
            )
            expect(mockResponse.status).toHaveBeenCalledWith(200)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Session refreshed'
            })
        })

        it('should respond with 401 if refresh token ' +
            'verification fails', async () => {
            const mockRequest = {
                cookies: { refreshToken: 'invalidRefreshToken' }
            }

            jsonwebtoken.verify.mockImplementation(() => {
                throw new Error('Invalid token')
            })
            await sessionController.refreshSession(mockRequest, mockResponse)

            expect(mockResponse.status).toHaveBeenCalledWith(401)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Invalid refresh token'
            })
        })
    })

    describe('verifyTotp', () => {
        it('should respond with 400 if userId or totpCode ' +
            'is missing', async () => {
            const mockRequest = { body: {} }

            await sessionController.verifyTotp(mockRequest, mockResponse)

            expect(mockResponse.status).toHaveBeenCalledWith(400)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'userId and TOTP code required'
            })
        })

        it('should respond with 404 if user is not found', async () => {
            const mockRequest = { body: { userId: 99, totpCode: '123456' } }

            dbConnection.execute.mockResolvedValue([[]])
            await sessionController.verifyTotp(mockRequest, mockResponse)

            expect(dbConnection.execute)
                .toHaveBeenCalledWith(expect.stringContaining('SELECT'), [99])
            expect(mockResponse.status).toHaveBeenCalledWith(404)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'User not found'
            })
        })

        it('should respond with 401 if TOTP code is invalid', async () => {
            const userFromDb = [{
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
                role: 'user',
                totp_auth_secret: 'encryptedSecret',
                totp_auth_init_vector: 'iv',
                totp_auth_tag: 'tag'
            }]
            const mockRequest = {
                body: { userId: 1, totpCode: 'wrongcode' }
            }

            dbConnection.execute.mockResolvedValue([userFromDb])
            encryptionUtility.decryptTotpSecret
                .mockReturnValue('decryptedSecret')
            authenticator.verify.mockReturnValue(false)
            await sessionController.verifyTotp(mockRequest, mockResponse)

            expect(encryptionUtility.decryptTotpSecret).toHaveBeenCalledWith({
                encryptedTotpSecret: 'encryptedSecret',
                initVector: 'iv',
                authTag: 'tag'
            })
            expect(authenticator.verify).toHaveBeenCalledWith({
                token: 'wrongcode',
                secret: 'decryptedSecret'
            })
            expect(mockResponse.status).toHaveBeenCalledWith(401)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Invalid TOTP code'
            })
        })

        it('should respond with 200 and set tokens when TOTP code ' +
            'is valid', async () => {
            const userFromDb = [{
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
                role: 'user',
                totp_auth_secret: 'encryptedSecret',
                totp_auth_init_vector: 'iv',
                totp_auth_tag: 'tag'
            }]
            const mockRequest = {
                body: { userId: 1, totpCode: 'correctcode' }
            }

            dbConnection.execute.mockResolvedValue([userFromDb])
            encryptionUtility.decryptTotpSecret
                .mockReturnValue('decryptedSecret')
            authenticator.verify.mockReturnValue(true)
            jsonwebtoken.sign
                .mockImplementation(userInfo => `token-${userInfo.id}`)
            await sessionController.verifyTotp(mockRequest, mockResponse)

            expect(jsonwebtoken.sign).toHaveBeenCalledTimes(2)
            expect(mockResponse.cookie).toHaveBeenCalledWith(
                'accessToken',
                'token-1',
                expect.objectContaining({
                    httpOnly: true,
                    secure: expect.any(Boolean),
                    maxAge: 3600000,
                    sameSite: 'Strict'
                })
            )
            expect(mockResponse.cookie).toHaveBeenCalledWith(
                'refreshToken',
                'token-1',
                expect.objectContaining({
                    httpOnly: true,
                    secure: expect.any(Boolean),
                    maxAge: 7 * 24 * 60 * 60 * 1000,
                    sameSite: 'Strict'
                })
            )
            expect(mockResponse.status).toHaveBeenCalledWith(200)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Signed in successfully',
                user: expect.not.objectContaining({
                    totp_auth_secret: expect.anything(),
                    totp_auth_init_vector: expect.anything(),
                    totp_auth_tag: expect.anything()
                })
            })
        })

        it('should respond with 500 on unexpected error', async () => {
            const mockRequest = { body: { userId: 1, totpCode: 'anycode' } }

            dbConnection.execute.mockRejectedValue(new Error('DB error'))
            await sessionController.verifyTotp(mockRequest, mockResponse)

            expect(mockResponse.status).toHaveBeenCalledWith(500)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Internal server error'
            })
        })
    })
})
