import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest }
    from '@jest/globals'
import bcryptjs from 'bcryptjs'
import jsonwebtoken from 'jsonwebtoken'
import otplib from 'otplib'
import sessionController from '../../controllers/sessionController.js'
import dbConnection from '../../db/dbConnection.js'
import validateSession from '../../util/validateSession.js'
import encryptionHelper from '../../util/encryptionHelper.js'

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
jest.mock('../../util/encryptionHelper.js')

describe('sessionController', () => {
    let user = {
        id: 1,
        username: 'User1',
        email: 'user1@example.com',
        password: 'Password&123456789',
        totp_auth_secret: 'encryptedSecret',
        totp_auth_init_vector: 'iv',
        totp_auth_tag: 'tag'
    }
    let request = {
        body: {
            email: user.email,
            password: user.password,
            hCaptchaToken: 'validToken'
        },
        cookies: {}
    }
    let response

    beforeEach(() => {
        user = Object.assign({}, user)
        request = Object.assign({}, request)
        response = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            clearCookie: jest.fn(),
            cookie: jest.fn()
        }
    })

    afterEach(() => { jest.clearAllMocks() })

    beforeAll(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {})
        global.fetch = jest.fn()
    })

    afterAll(() => { console.error.mockRestore() })

    describe('readSession', () => {
        it('returns user if session is valid', async () => {
            validateSession.mockReturnValue({ id: 1 })
            user.totp_auth_on = 0
            dbConnection.executeQuery.mockResolvedValue([user])

            await sessionController.readSession(request, response)

            expect(dbConnection.executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('SELECT'),
                [1]
            )
            expect(response.status).toHaveBeenCalledWith(200)
            expect(response.json).toHaveBeenCalled()
        })

        it('returns null if session is invalid', async () => {
            validateSession.mockReturnValue(null)
            await sessionController.readSession(request, response)

            expect(response.status).toHaveBeenCalledWith(200)
            expect(response.json).toHaveBeenCalledWith({ user: null })
        })
    })

    describe('createSession', () => {
        it('signs in successfully and sets tokens ' +
            'when credentials are valid', async () => {
            user.account_verified = 1
            user.totp_auth_on = 0
            request = {
                body: {
                    email: user.email,
                    password: user.password,
                    hCaptchaToken: 'validToken'
                },
                cookies: {}
            }

            dbConnection.executeQuery.mockResolvedValue([user])
            bcryptjs.compare.mockResolvedValue(true)
            jsonwebtoken.sign
                .mockImplementation(userInfo => `token-${userInfo.id}`)

            fetch.mockResolvedValueOnce({
                json: () => Promise.resolve({ success: true })
            })

            await sessionController.createSession(request, response)

            expect(dbConnection.executeQuery).toHaveBeenCalled()
            expect(bcryptjs.compare).toHaveBeenCalled()
            expect(jsonwebtoken.sign).toHaveBeenCalledTimes(2)
            expect(response.status).toHaveBeenCalledWith(200)
            expect(response.json).toHaveBeenCalled()
            expect(response.cookie).toHaveBeenCalledTimes(2)
        })

        it('returns 401 if password does not match', async () => {
            request.body.password = 'wrongpassword'

            dbConnection.executeQuery.mockResolvedValue([user])
            bcryptjs.compare.mockResolvedValue(false)

            fetch.mockResolvedValueOnce({
                json: () => Promise.resolve({ success: true })
            })

            await sessionController.createSession(request, response)

            expect(response.status).toHaveBeenCalledWith(401)
            expect(response.json).toHaveBeenCalled()
        })

        it('returns 403 if account not verified', async () => {
            user.account_verified = 0

            dbConnection.executeQuery.mockResolvedValue([user])
            bcryptjs.compare.mockResolvedValue(true)

            fetch.mockResolvedValueOnce({
                json: () => Promise.resolve({ success: true })
            })

            await sessionController.createSession(request, response)

            expect(response.status).toHaveBeenCalledWith(403)
            expect(response.json).toHaveBeenCalled()
        })

        it('returns TOTP prompt if totp_auth_on is true', async () => {
            user.account_verified = 1
            user.totp_auth_on = 1

            dbConnection.executeQuery.mockResolvedValue([user])
            bcryptjs.compare.mockResolvedValue(true)

            fetch.mockResolvedValueOnce({
                json: () => Promise.resolve({ success: true })
            })

            await sessionController.createSession(request, response)

            expect(response.status).toHaveBeenCalledWith(200)
            expect(response.json).toHaveBeenCalled()
        })
    })

    describe('refreshSession', () => {
        it('returns 401 if no refresh token cookie is provided', async () => {
            await sessionController.refreshSession(request, response)

            expect(response.status).toHaveBeenCalledWith(401)
            expect(response.json).toHaveBeenCalled()
        })

        it('returns 200 and set new access token cookie ' +
            'when refresh token is valid', async () => {
            const decryptedToken = { id: 1 }
            const accessToken = 'accessToken123'
            request.cookies = { refreshToken: 'validRefreshToken' }

            jsonwebtoken.verify.mockReturnValue(decryptedToken)
            jsonwebtoken.sign.mockReturnValue(accessToken)

            await sessionController.refreshSession(request, response)

            expect(jsonwebtoken.verify).toHaveBeenCalled()
            expect(jsonwebtoken.sign).toHaveBeenCalled()
            expect(response.cookie).toHaveBeenCalled()
            expect(response.status).toHaveBeenCalledWith(200)
            expect(response.json).toHaveBeenCalled()
        })

        it('returns 401 if refresh token verification fails', async () => {
            request.cookies = { refreshToken: 'invalidRefreshToken' }

            jsonwebtoken.verify.mockImplementation(() => {
                throw new Error('Invalid token')
            })

            await sessionController.refreshSession(request, response)

            expect(response.status).toHaveBeenCalledWith(401)
            expect(response.json).toHaveBeenCalled()
        })
    })

    describe('verifyTotp', () => {
        it('returns 400 if userId or totpCode is missing', async () => {

            await sessionController.verifyTotp(request, response)

            expect(response.status).toHaveBeenCalledWith(400)
            expect(response.json).toHaveBeenCalled()
        })

        it('returns 404 if user is not found', async () => {
            request.body = { userId: 99, totpCode: '123456' }

            dbConnection.executeQuery.mockResolvedValue([])

            await sessionController.verifyTotp(request, response)

            expect(dbConnection.executeQuery).toHaveBeenCalled()
            expect(response.status).toHaveBeenCalledWith(404)
            expect(response.json).toHaveBeenCalledWith({
                message: 'User not found'
            })
        })

        it('returns 401 if TOTP is invalid', async () => {
            request.body = { userId: 1, totpCode: 'wrongcode' }

            dbConnection.executeQuery.mockResolvedValue([user])

            encryptionHelper.decryptTotpSecret
                .mockReturnValue('decryptedSecret')
            otplib.authenticator.verify.mockReturnValue(false)
            
            await sessionController.verifyTotp(request, response)

            expect(encryptionHelper.decryptTotpSecret).toHaveBeenCalled()
            expect(otplib.authenticator.verify).toHaveBeenCalled()
            expect(response.status).toHaveBeenCalledWith(401)
            expect(response.json).toHaveBeenCalled()
        })

        it('returns 200 and set tokens when TOTP is valid', async () => {
            request.body = { userId: 1, totpCode: 'correctCode' }

            dbConnection.executeQuery.mockResolvedValue([user])

            encryptionHelper.decryptTotpSecret
                .mockReturnValue('decryptedSecret')
            otplib.authenticator.verify.mockReturnValue(true)
            jsonwebtoken.sign
                .mockImplementation(userInfo => `token-${userInfo.id}`)
                
            await sessionController.verifyTotp(request, response)

            expect(jsonwebtoken.sign).toHaveBeenCalledTimes(2)
            expect(response.cookie).toHaveBeenCalled()
            expect(response.cookie).toHaveBeenCalled()
            expect(response.status).toHaveBeenCalledWith(200)
            expect(response.json).toHaveBeenCalled()
        })
    })
    
    describe('deleteSession', () => {
        it('returns 200 and accessToken and refreshToken cookies', () => {
            sessionController.deleteSession(request, response)

            expect(response.clearCookie).toHaveBeenCalled
            expect(response.clearCookie).toHaveBeenCalled()
            expect(response.status).toHaveBeenCalledWith(200)
            expect(response.json).toHaveBeenCalled()
        })
    })
})
