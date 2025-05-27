import bcryptjs from 'bcryptjs'
import crypto from 'crypto'
import otplib from 'otplib'
import qrcode from 'qrcode'
import verificationController from '../../controllers/verificationController.js'
import dbConnection from '../../db/dbConnection.js'
import validateUser from '../../util/validateUser.js'
import validateSession from '../../util/validateSession.js'
import handleDbError from '../../util/handleDbError.js'
import encryptionUtility from '../../util/encryptionUtility.js'
import emailTransporter from '../../util/emailTransporter.js'
import verificationEmail from '../../templates/verificationEmail.js'
import passwordResetEmail from '../../templates/passwordResetEmail.js'
import emailRemovalEmail from '../../templates/emailRemovalEmail.js'
import deleteAccountEmail from '../../templates/deleteAccountEmail.js'

jest.mock('bcryptjs')
jest.mock('jsonwebtoken')
jest.mock('crypto', () => ({
    randomBytes: jest.fn()
}))
jest.mock('otplib', () => ({
    authenticator: {
        generateSecret: jest.fn(),
        keyuri: jest.fn(),
        verify: jest.fn()
    }
}))
jest.mock('qrcode', () => ({
    toDataURL: jest.fn()
}))
jest.mock('../../db/dbConnection.js')
jest.mock('../../util/handleDbError.js')
jest.mock('../../util/validateSession.js')
jest.mock('../../util/encryptionUtility.js')
jest.mock('../../util/emailTransporter.js')
jest.mock('nodemailer', () => ({
    createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue(true)
    })
}))

describe('verificationController', () => {
    const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    }

    beforeEach(() => { jest.clearAllMocks() })
    beforeAll(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {})
    })
    afterAll(() => { console.error.mockRestore() })

    describe('verifyAccountByEmail', () => {
        it('should return error if token is invalid or not found', async () => {
            dbConnection.execute.mockResolvedValueOnce([[]])

            const mockRequest = {
                query: { token: 'invalidToken' }
            }

            await verificationController.verifyAccountByEmail(
                mockRequest,
                mockResponse
            )

            expect(mockResponse.status).toHaveBeenCalledWith(400)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Invalid or expired token'
            })
        })

        it('should return error if token is expired', async () => {
            const expiredTokenData = [
                {
                    id: 1,
                    expires_at: new Date(new Date().getTime() - 60 * 60 * 1000)
                }
            ]
            dbConnection.execute.mockResolvedValueOnce([expiredTokenData])

            const mockRequest = {
                query: { token: 'expiredToken' }
            }

            await verificationController.verifyAccountByEmail(
                mockRequest,
                mockResponse
            )

            expect(mockResponse.status).toHaveBeenCalledWith(400)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Invalid or expired token'
            })
        })

        it('should return success if token is valid ' +
            'and not expired', async () => {
            const validTokenData = [
                {
                    id: 1,
                    expires_at: new Date(new Date().getTime() + 10000)
                }
            ]
            
            dbConnection.execute
                .mockResolvedValueOnce([validTokenData])
                .mockResolvedValueOnce([{}])
                .mockResolvedValueOnce([{}])

            const mockRequest = {
                query: { token: 'validToken' }
            }

            await verificationController.verifyAccountByEmail(
                mockRequest,
                mockResponse
            )

            expect(mockResponse.status).toHaveBeenCalledWith(200)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Email address verified successfully'
            })
        })

        it('should handle errors using handleDbError', async () => {
            const mockError = new Error('Database failure')
            const mockRequest = {
                query: { token: 'someToken' }
            }
            
            dbConnection.execute.mockRejectedValueOnce(mockError)
            await verificationController.verifyAccountByEmail(
                mockRequest,
                mockResponse
            )

            expect(handleDbError).toHaveBeenCalledWith(mockResponse, mockError)
        })
    })

    describe('confirmEmailChange', () => {
        it('should return error if token is invalid or not found', async () => {
            const mockRequest = { query: { token: 'invalidToken' } }

            dbConnection.execute.mockResolvedValueOnce([[]])
            await verificationController.confirmEmailChange(
                mockRequest,
                mockResponse
            )

            expect(mockResponse.status).toHaveBeenCalledWith(400)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Invalid or expired token'
            })
        })

        it('should return error if token is expired', async () => {
            const expiredTokenData = [
                {
                    id: 1,
                    email: 'oldemail@example.com',
                    email_pending: 'newemail@example.com',
                    token_value: 'expiredToken',
                    expires_at: new Date(new Date().getTime() - 60 * 60 * 1000)
                }
            ]
            const mockRequest = {
                query: { token: 'expiredToken' }
            }

            dbConnection.execute.mockResolvedValueOnce([expiredTokenData])
            await verificationController.confirmEmailChange(
                mockRequest,
                mockResponse
            )

            expect(mockResponse.status).toHaveBeenCalledWith(400)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Invalid or expired token'
            })
        })

        it('should update email successfully if token is valid ' +
            'and not expired', async () => {
            const validTokenData = [
                {
                    id: 1,
                    email: 'oldemail@example.com',
                    email_pending: 'newemail@example.com',
                    token_value: 'validToken',
                    expires_at: new Date(new Date().getTime() + 60 * 60 * 1000)
                }
            ]
            const mockRequest = {
                query: { token: 'validToken' }
            }

            dbConnection.execute
                .mockResolvedValueOnce([validTokenData])
                .mockResolvedValueOnce([{}])
                .mockResolvedValueOnce([{}])
            await verificationController.confirmEmailChange(
                mockRequest,
                mockResponse
            )

            expect(mockResponse.status).toHaveBeenCalledWith(200)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Email address updated successfully'
            })
            expect(emailTransporter.sendMail)
                .toHaveBeenCalledWith(expect.objectContaining({
                    from: process.env.EMAIL_USER,
                    to: 'oldemail@example.com',
                    subject: expect.stringContaining('has been removed from'),
                    html: expect.any(String)
                }))
        })

        it('should handle errors using handleDbError', async () => {
            const mockError = new Error('Database failure')
            const mockRequest = {
                query: { token: 'anyToken' }
            }
            
            dbConnection.execute.mockRejectedValueOnce(mockError)
            await verificationController.confirmEmailChange(
                mockRequest,
                mockResponse
            )

            expect(handleDbError).toHaveBeenCalledWith(mockResponse, mockError)
        })
    })

    describe('getTotpSecret', () => {
        it('should return error if id is missing', async () => {
            const mockRequest = { body: {} }

            await verificationController.getTotpSecret(
                mockRequest,
                mockResponse
            )

            expect(mockResponse.status).toHaveBeenCalledWith(400)
            expect(mockResponse.json)
                .toHaveBeenCalledWith({ message: 'Error in request' })
        })

        it('should return 404 if user not found', async () => {
            const mockRequest = { body: { id: 1 } }

            dbConnection.execute.mockResolvedValue([[]])
            await verificationController.getTotpSecret(
                mockRequest,
                mockResponse
            )

            expect(mockResponse.status).toHaveBeenCalledWith(404)
            expect(mockResponse.json)
                .toHaveBeenCalledWith({ message: 'User not found' })
        })

        it('should return totpSecret and qrCodeImage ' +
            'if user found and request is valid', async () => {
            const mockRequest = { body: { id: 1 } }
            const totpSecret = '1234567890abcdef'
            const totpUri = 'otpauth://totp/TestApp:user@example.com' +
                            '?secret=1234567890abcdef'
            const qrCodeImage = 'data:image/png;base64,encodedimage'

            otplib.authenticator.generateSecret.mockReturnValue(totpSecret)
            otplib.authenticator.keyuri.mockReturnValue(totpUri)
            qrcode.toDataURL.mockResolvedValue(qrCodeImage)
            dbConnection.execute.mockResolvedValue([[{
                email: 'user@example.com'
            }]])
            await verificationController.getTotpSecret(
                mockRequest,
                mockResponse
            )

            expect(mockResponse.status).toHaveBeenCalledWith(200)
            expect(mockResponse.json).toHaveBeenCalledWith({
                totpSecret,
                qrCodeImage
            })
        })

        it('should handle errors and return status code 401', async () => {
            const mockRequest = { body: { id: 1 } }
            const error = new Error('Database error')

            dbConnection.execute.mockRejectedValue(error)
            await verificationController.getTotpSecret(
                mockRequest,
                mockResponse
            )

            expect(mockResponse.status).toHaveBeenCalledWith(401)
            expect(mockResponse.json)
                .toHaveBeenCalledWith({ message: error.message })
        })
    })

    describe('resendVerificationEmail', () => {
        it('should return success message if ' +
            'email not found in database', async () => {
            const mockRequest = { body: { email: 'nonuser@example' } }
            
            dbConnection.execute.mockResolvedValue([[]])
            await verificationController.resendVerificationEmail(
                mockRequest,
                mockResponse
            )

            expect(mockResponse.status).toHaveBeenCalledWith(200)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'If you entered an email address that is pending ' +
                         'verification, then a new verification email will ' +
                         'be sent to that address'
            })

            expect(emailTransporter.sendMail).not.toHaveBeenCalled()
        })

        it('should return success message if ' +
            'user already verified', async () => {
            const mockRequest = { body: { email: 'verified@example.com' } }

            dbConnection.execute.mockResolvedValue([[
                { id: 1, username: 'testuser', account_verified: true }
            ]])
            await verificationController.resendVerificationEmail(
                mockRequest,
                mockResponse
            )

            expect(mockResponse.status).toHaveBeenCalledWith(200)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'If you entered an email address that is pending ' +
                         'verification, then a new verification email will ' +
                         'be sent to that address'
            })
            expect(emailTransporter.sendMail).not.toHaveBeenCalled()
        })

        it('should send verification email if ' +
            'user is not verified', async () => {
            const mockRequest = { body: { email: 'unverified@example.com' } }
            const mockUser = {
                id: 21,
                username: 'newuser',
                account_verified: false
            }
            const mockToken = 'newToken123'

            dbConnection.execute.mockResolvedValue([[mockUser]])
            crypto.randomBytes =
                jest.fn().mockReturnValue({ toString: () => mockToken })
            emailTransporter.sendMail = jest.fn()

            await verificationController.resendVerificationEmail(
                mockRequest,
                mockResponse
            )

            expect(mockResponse.status).toHaveBeenCalledWith(200)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'If you entered an email address that is pending ' +
                         'verification, then a new verification email will ' +
                         'be sent to that address'
            })

            expect(emailTransporter.sendMail).toHaveBeenCalledWith({
                from: process.env.EMAIL_USER,
                to: 'unverified@example.com',
                subject: 'Please confirm your email address for ' +
                         `${process.env.APP_NAME}`,
                html: expect.any(String)
            })
        })
    })

    describe('sendPasswordResetEmail', () => {
        it('should return success message if email is not ' +
            'associated with any account', async () => {
            const mockRequest = { body: { email: 'nonuser@example' } }

            dbConnection.execute.mockResolvedValue([[]])
            await verificationController.sendPasswordResetEmail(
                mockRequest,
                mockResponse
            )

            expect(mockResponse.status).toHaveBeenCalledWith(200)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'If the email address is associated with an ' +
                         'account, then a password reset link has been sent'
            })
            expect(emailTransporter.sendMail).not.toHaveBeenCalled()
        })

        it('should send password reset email if email is ' +
            'associated with an account', async () => {
            const mockRequest = { body: { email: 'user@example.com' } }
            const mockUser = { id: 1, username: 'testuser' }
            const resetToken = 'resetToken123'
            const mockEmailContent = expect.any(String)

            dbConnection.execute.mockResolvedValue([[mockUser]])
            crypto.randomBytes =
                jest.fn().mockReturnValue({ toString: () => resetToken })
            emailTransporter.sendMail = jest.fn()
            await verificationController.sendPasswordResetEmail(
                mockRequest,
                mockResponse
            )

            expect(mockResponse.status).toHaveBeenCalledWith(200)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'If the email address is associated with an ' +
                         'account, then a password reset link has been sent'
            })

            expect(emailTransporter.sendMail).toHaveBeenCalledWith({
                from: process.env.EMAIL_USER,
                to: 'user@example.com',
                subject: 'Reset your password for ' + process.env.APP_NAME,
                html: mockEmailContent
            })
        })

        it('should handle errors using handleDbError if ' +
            'database operation fails', async () => {
            const mockError = new Error('Database error')
            const mockRequest = { body: { email: 'user@example.com' } }
            
            dbConnection.execute.mockRejectedValueOnce(mockError)
            await verificationController.sendPasswordResetEmail(
                mockRequest,
                mockResponse
            )

            expect(handleDbError).toHaveBeenCalledWith(mockResponse, mockError)
        })
    })

    describe('requestDeleteUser', () => {
        it('should return success message if email is not associated with any account', async () => {
            const mockRequest = { body: { id: 700, email: 'nonuser@example.com' } }

            dbConnection.execute.mockResolvedValue([[]])
            await verificationController.requestDeleteUser(mockRequest, mockResponse)

            expect(mockResponse.status).toHaveBeenCalledWith(404)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'User not found'
            })
        })

        it('should send account deletion confirmation email if email is associated with an account', async () => {
            const mockRequest = { body: { id: 5 } }
            const mockUser = { id: 5, username: 'existinguser', email: 'existinguser@example.com' }

            dbConnection.execute.mockResolvedValue([[mockUser]])
            crypto.randomBytes.mockReturnValue({ toString: () => 'deleteToken123' })
            emailTransporter.sendMail.mockResolvedValue(true)
            await verificationController.requestDeleteUser(mockRequest, mockResponse)

            expect(mockResponse.status).toHaveBeenCalledWith(200)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Account deletion requested — please check your email to confirm'
            })
            expect(emailTransporter.sendMail).toHaveBeenCalledWith({
                from: process.env.EMAIL_USER,
                to: 'existinguser@example.com',
                subject: `Confirm account deletion for ${process.env.APP_NAME}`,
                html: expect.any(String)
            })
        })

        it('should handle errors using handleDbError if database operation fails', async () => {
            const mockRequest = { body: { id: 5 } }
            const mockError = new Error('Database error')

            dbConnection.execute.mockRejectedValueOnce(mockError)
            await verificationController.requestDeleteUser(mockRequest, mockResponse)

            expect(handleDbError).toHaveBeenCalledWith(mockResponse, mockError)
        })
    })

    describe('resetPassword', () => {
        it('should return error if email, new password, or token are missing', async () => {
            const mockRequest = { body: { email: '', newPassword: '', token: '' } }

            await verificationController.resetPassword(mockRequest, mockResponse)

            expect(mockResponse.status).toHaveBeenCalledWith(400)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Token, email address and new password required'
            })
        })

        it('should return error if email is not associated with any account', async () => {
            const mockRequest = { body: { email: 'someuser@example.com', newPassword: 'newPassword', token: 'validToken' } }

            dbConnection.execute.mockResolvedValueOnce([[]])
            await verificationController.resetPassword(mockRequest, mockResponse)

            expect(mockResponse.status).toHaveBeenCalledWith(400)
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Invalid/expired token or invalid email address'
            })
        })
        
        it('should update the password successfully', async () => {
            const mockRequest = {
                body: {
                    email: 'someuser@example.com',
                    newPassword: 'NewPassword&123456789',
                    token: 'validToken'
                }
            }

            await verificationController.resetPassword(mockRequest, mockResponse)

            expect(mockResponse.status).toHaveBeenCalledWith(200)
            expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Password reset successfully' })
        })



    })

})
