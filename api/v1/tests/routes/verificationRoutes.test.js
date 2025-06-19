import { describe, it, expect, beforeEach, afterEach, jest }
    from '@jest/globals'
import request from 'supertest'
import express from 'express'
import verificationRoutes from '../../routes/verificationRoutes.js'
import verificationController from '../../controllers/verificationController.js'

jest.mock('../../controllers/verificationController.js', () => ({
    verifyAccountByEmail: jest.fn(),
    confirmEmailChange: jest.fn(),
    getTotpSecret: jest.fn(),
    resendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    requestDeleteUser: jest.fn(),
    setTotpAuth: jest.fn(),
    resetPassword: jest.fn()
}))

beforeEach(() => {
    verificationController.verifyAccountByEmail
        .mockImplementation((request, response) => {
            response.status(200).json({
                message: 'Email address verified successfully'
            })
        })

    verificationController.confirmEmailChange
        .mockImplementation((request, response) => {
            response.status(200).json({
                message: 'Email address updated successfully'
            })
        })

    verificationController.getTotpSecret
        .mockImplementation((request, response) => {
            response.status(200).json({
                totpSecret: 'AAAAAAAAAAAAAAAA',
                qrCodeImage:
                    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA' +
                    'AAAFCAYAAACNbyblAAAAHElEQVQI12P4' +
                    '//8/w38GIAXDIBKE0DHxgljNBAAO' +
                    '9TXL0Y4OHwAAAABJRU5ErkJggg=='
            })
        })
        
    verificationController.resendVerificationEmail
        .mockImplementation((request, response) => {
            response.status(200).json({
                message: expect.stringContaining('If you entered an email')
            })
        })

    verificationController.sendPasswordResetEmail
        .mockImplementation((request, response) => {
            response.status(200).json({
                message: expect.stringContaining('If the email address is')
            })
        })

    verificationController.requestDeleteUser
        .mockImplementation((request, response) => {
            response.status(200).json({
                message: expect.stringContaining('Account deletion requested')
            })
        })

    verificationController.setTotpAuth
        .mockImplementation((request, response) => {
            response.status(200).json({
                message: 'Two-factor authentication enabled successfully'
            })
        })

    verificationController.resetPassword
        .mockImplementation((request, response) => {
            response.status(200).json({
                message: 'Password reset successfully'
            })
        })
})

describe('verificationRoutes', () => {
    let app

    beforeEach(() => {
        app = express()
        app.use(express.json())
        app.use('/api/v1/verifications', verificationRoutes)
    })
    afterEach(() => { jest.clearAllMocks() })

    it(
        'handles GET /api/v1/verifications/verify-account-by-email',
        async () => {
            const response = await request(app).get(
                '/api/v1/verifications/verify-account-by-email'
            )
            expect(response.status).toBe(200)
        })

    it('handles GET /api/v1/verifications/confirm-email-change', async () => {
        const response = await request(app).get(
            '/api/v1/verifications/confirm-email-change'
        )
        expect(response.status).toBe(200)
    })

    it('handles POST /api/v1/verifications/get-totp-secret', async () => {
        const response = await request(app).post(
            '/api/v1/verifications/get-totp-secret'
        )
        expect(response.status).toBe(200)
    })

    it(
        'handles POST /api/v1/verifications/resend-verification-email',
        async () => {
            const response = await request(app).post(
                '/api/v1/verifications/resend-verification-email'
            )
            expect(response.status).toBe(200)
        })

    it(
        'handles POST /api/v1/verifications/send-password-reset-email',
        async () => {
            const response = await request(app).post(
                '/api/v1/verifications/send-password-reset-email'
            )
            expect(response.status).toBe(200)
        })

    it(
        'handles POST /api/v1/verifications/request-account-deletion',
        async () => {
            const response = await request(app).post(
                '/api/v1/verifications/request-account-deletion'
            )
            expect(response.status).toBe(200)
        })

    it('handles PATCH /api/v1/verifications/set-totp-auth', async () => {
        const response = await request(app).patch(
            '/api/v1/verifications/set-totp-auth'
        )
        expect(response.status).toBe(200)
    })
    
    it('handles PATCH /api/v1/verifications/reset-password', async () => {
        const response = await request(app).patch(
            '/api/v1/verifications/reset-password'
        )
        expect(response.status).toBe(200)
    })
})
