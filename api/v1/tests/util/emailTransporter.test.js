import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals'
import nodemailer from 'nodemailer'

jest.mock('nodemailer', () => ({
    createTransport: jest.fn().mockReturnValue({})
}))

describe('emailTransporter', () => {
    const originalEnv = Object.assign({}, process.env)

    beforeAll(() => {
        process.env.EMAIL_SERVICE = 'gmail'
        process.env.EMAIL_USER = 'sender@gmail.com'
        process.env.EMAIL_APP_PASSWORD = 'Password&123456789'
    })

    afterAll(() => { process.env = originalEnv })

    it('creates a nodemailer transporter with the correct configuration',
        async () => {
            const { default: emailTransporter } =
                await import('../../util/emailTransporter.js')

            expect(nodemailer.createTransport).toHaveBeenCalledWith({
                service: 'gmail',
                auth: {
                    user: 'sender@gmail.com',
                    pass: 'Password&123456789'
                }
            })

            expect(emailTransporter).toBeDefined()
        })
})