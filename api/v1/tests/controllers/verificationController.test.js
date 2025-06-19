import { describe, it, expect, beforeEach, afterEach, jest }
    from '@jest/globals'
import otplib from 'otplib'
import qrcode from 'qrcode'
import dbConnection from '../../db/dbConnection.js'
import encryptionHelper from '../../util/encryptionHelper.js'
import emailTransporter from '../../util/emailTransporter.js'
import verificationController from '../../controllers/verificationController.js'

jest.mock('bcryptjs')
jest.mock('jsonwebtoken')
jest.mock('otplib', () => ({
    authenticator: {
        generateSecret: jest.fn(),
        keyuri: jest.fn(),
        verify: jest.fn()
    }
}))
jest.mock('qrcode', () => ({ toDataURL: jest.fn() }))
jest.mock('../../db/dbConnection.js')
jest.mock('../../util/validateSession.js')
jest.mock('../../util/encryptionHelper.js')
jest.mock('../../util/emailTransporter.js')
jest.mock('nodemailer', () => ({
    createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue(true)
    })
}))

describe('verificationController', () => {
    let request
    let response
    
    beforeEach(() => {
        request = {}
        response = {
            send: jest.fn(),
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        }

        jest.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => { jest.clearAllMocks() })

    describe('verifyAccountByEmail', () => {
        it('verifies account successfully if token is valid', async () => {
            request.query = { token: 'validToken' }

            dbConnection.executeQuery
                .mockResolvedValueOnce([{
                    id: 1,
                    expires_at: new Date(new Date().getTime() + 10000)
                }])
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({})

            await verificationController.verifyAccountByEmail(request, response)

            expect(response.status).toHaveBeenCalledWith(200)
            expect(response.json).toHaveBeenCalled()
        })

        it('returns error if token is invalid or missing', async () => {
            request.query = { token: 'invalidToken' }

            dbConnection.executeQuery.mockResolvedValueOnce([])

            await verificationController.verifyAccountByEmail(request, response)

            expect(response.status).toHaveBeenCalledWith(400)
            expect(response.json).toHaveBeenCalledWith({
                message: 'Invalid or expired token'
            })
        })        

        it('returns error if token is expired', async () => {
            request.query = { token: 'expiredToken' }

            dbConnection.executeQuery.mockResolvedValueOnce([{
                id: 1,
                expires_at: new Date(new Date().getTime() - 60 * 60 * 1000)             
            }])

            await verificationController.verifyAccountByEmail(request, response)

            expect(response.status).toHaveBeenCalledWith(400)
            expect(response.json).toHaveBeenCalled()
        })
    })

    describe('confirmEmailChange', () => {
        it('updates email successfully if token is valid ' +
            'and not expired', async () => {
            request.query = { token: 'validToken' }

            dbConnection.executeQuery
                .mockResolvedValueOnce([{
                    id: 1,
                    email: 'oldemail@example.com',
                    email_pending: 'newemail@example.com',
                    token_value: 'validToken',
                    expires_at: new Date(new Date().getTime() + 60 * 60 * 1000)                    
                }])
                .mockResolvedValueOnce([{}])
                .mockResolvedValueOnce([{}])

            await verificationController.confirmEmailChange(request, response)

            expect(response.status).toHaveBeenCalledWith(200)
            expect(response.json).toHaveBeenCalled()
            expect(emailTransporter.sendMail).toHaveBeenCalled()
        })
        
        it('returns error if token is invalid or missing', async () => {
            request.query = { token: 'invalidToken' }

            dbConnection.executeQuery.mockResolvedValueOnce([[]])
            await verificationController.confirmEmailChange(request, response)

            expect(response.status).toHaveBeenCalledWith(400)
            expect(response.json).toHaveBeenCalled()
        })
        
        it('returns error if token is expired', async () => {
            request.query = { token: 'expiredToken' }
            
            dbConnection.executeQuery.mockResolvedValueOnce([{
                id: 1,
                email: 'oldemail@example.com',
                email_pending: 'newemail@example.com',
                token_value: 'expiredToken',
                expires_at: new Date(new Date().getTime() - 60 * 60 * 1000)                
            }])

            await verificationController.confirmEmailChange(request, response)

            expect(response.status).toHaveBeenCalledWith(400)
            expect(response.json).toHaveBeenCalled()
        })
    })

    describe('getTotpSecret', () => {
        it('returns totpSecret and qrCodeImage ' +
            'if user found and request is valid', async () => {
            const totpSecret = 'abcdef123456'
            const totpUri = 'otpauth://totp/TestApp:user@example.com' +
                            '?secret=abcdef123456'
            const qrCodeImage = 'data:image/png;base64,encodedimage'
            request.body = { id: 1 }

            otplib.authenticator.generateSecret.mockReturnValue(totpSecret)
            otplib.authenticator.keyuri.mockReturnValue(totpUri)
            qrcode.toDataURL.mockResolvedValue(qrCodeImage)
            dbConnection.executeQuery.mockResolvedValue([[{
                email: 'user1@example.com'
            }]])
            
            await verificationController.getTotpSecret(request, response)

            expect(response.status).toHaveBeenCalledWith(200)
            expect(response.json).toHaveBeenCalled()
        })

        it('returns error if id is missing', async () => {
            request.body = {}

            await verificationController.getTotpSecret(request, response)

            expect(response.status).toHaveBeenCalledWith(400)
            expect(response.json).toHaveBeenCalled()
        })
    })

    describe('resendVerificationEmail', () => {
        it('sends verification email if user is not verified', async () => {
            request.body = { email: 'user2@example.com' }

            dbConnection.executeQuery.mockResolvedValue([{
                id: 2,
                username: 'User2',
                account_verified: 0
            }])
            crypto.randomBytes =
                jest.fn().mockReturnValue({ toString: () => 'verificationToken' })
            emailTransporter.sendMail = jest.fn()

            await verificationController.resendVerificationEmail(
                request,
                response
            )

            expect(response.status).toHaveBeenCalledWith(200)
            expect(response.json).toHaveBeenCalled()
            expect(emailTransporter.sendMail).toHaveBeenCalled()
        })

        it('returns success message if user already verified', async () => {
            request.body = { email: 'user1@example.com' }

            dbConnection.executeQuery.mockResolvedValue([{
                id: 1,
                username: 'User1',
                account_verified: 1
            }])

            await verificationController.resendVerificationEmail(
                request,
                response
            )

            expect(response.status).toHaveBeenCalledWith(200)
            expect(response.json).toHaveBeenCalled()
            expect(emailTransporter.sendMail).not.toHaveBeenCalled()
        })
    })

    describe('sendPasswordResetEmail', () => {
        it('sends password reset email if email is ' +
            'associated with an account', async () => {
            request.body = { email: 'user1@example.com' }

            dbConnection.executeQuery
                .mockResolvedValue([[{ id: 1, username: 'User1' }]])
            crypto.randomBytes =
                jest.fn().mockReturnValue({ toString: () => 'validToken' })
            emailTransporter.sendMail = jest.fn()

            await verificationController.sendPasswordResetEmail(
                request,
                response
            )

            expect(response.status).toHaveBeenCalledWith(200)
            expect(response.json).toHaveBeenCalledWith({
                message: expect.stringContaining('If the email address is')
            })
            expect(emailTransporter.sendMail).toHaveBeenCalled()
        })
    })

    describe('requestDeleteUser', () => {
        it('sends account deletion confirmation email if email ' +
            'is associated with an account', async () => {
            request.body = { id: 5 }
            request.cookies = { accessToken: 'validToken' }

            dbConnection.executeQuery.mockResolvedValue([[{
                id: 5,
                username: 'User1',
                email: 'user1@example.com'
            }]])

            crypto.randomBytes.mockReturnValue({ toString: () => 'validToken' })
            emailTransporter.sendMail.mockResolvedValue(true)

            await verificationController.requestDeleteUser(request, response)

            expect(response.status).toHaveBeenCalledWith(200)
            expect(response.json).toHaveBeenCalledWith({
                message: expect.stringContaining('Account deletion requested')
            })
            expect(emailTransporter.sendMail).toHaveBeenCalled()
        })
    })

    describe('setTotpAuth', () => {
        it('enables 2FA with valid code', async () => {
            request.body = {
                id: 1,
                totpAuthOn: 1,
                totpSecret: 'SECRET',
                totpCode: '123456'
            }

            otplib.authenticator.check = jest.fn().mockReturnValue(true)

            encryptionHelper.encryptTotpSecret.mockReturnValue({
                encryptedTotpSecret: 'encryptedSecret',
                initVector: 'initVector',
                authTag: 'authTag'
            })

            await verificationController.setTotpAuth(request, response)

            expect(dbConnection.executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE users'),
                ['encryptedSecret', 'initVector', 'authTag', 1]
            )
            expect(response.status).toHaveBeenCalledWith(200)
            expect(response.json).toHaveBeenCalled()
        })

        it('disables 2FA when totpAuthOn is false', async () => {
            request.body = { id: 1, totpAuthOn: false }

            await verificationController.setTotpAuth(request, response)

            expect(dbConnection.executeQuery).toHaveBeenCalled()
            expect(response.status).toHaveBeenCalledWith(200)
            expect(response.json).toHaveBeenCalledWith({
                message: 'Two-factor authentication disabled successfully'
            })
        })

        it('returns error if TOTP code is invalid', async () => {
            request.body = {
                id: 1,
                totpAuthOn: 1,
                totpSecret: 'SECRET',
                totpCode: '123456'
            }

            otplib.authenticator.check = jest.fn().mockReturnValue(false)

            await verificationController.setTotpAuth(request, response)

            expect(response.status).toHaveBeenCalledWith(400)
            expect(response.json).toHaveBeenCalled()
        })
    })

    describe('resetPassword', () => {
        it('resets the password successfully', async () => {
            request.body = {
                email: 'user1@example.com',
                newPassword: 'NewPassword&123456789',
                token: 'validToken'
            }

            await verificationController.resetPassword(request, response)

            expect(response.status).toHaveBeenCalledWith(200)
            expect(response.json).toHaveBeenCalled()
        })        
    })
})
