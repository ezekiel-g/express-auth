import nodemailer from 'nodemailer'

jest.mock('nodemailer', () => ({
    createTransport: jest.fn().mockReturnValue({}) // Mock the return value of createTransport
}))

describe('emailTransporter', () => {
    const originalEnv = Object.assign({}, process.env)

    beforeAll(() => {
        process.env.EMAIL_SERVICE = 'gmail'
        process.env.EMAIL_USER = 'sender@gmail.com'
        process.env.EMAIL_APP_PASSWORD = 'password123'
    })

    afterAll(() => {
        process.env = originalEnv
    })

    it('should create a nodemailer transporter with the correct configuration', async () => {
        // No need to call jest.resetModules() unless there's a very specific need
        const { default: emailTransporter } = await import('../../util/emailTransporter.js')

        // Check that createTransport was called with the correct configuration
        expect(nodemailer.createTransport).toHaveBeenCalledWith({
            service: 'gmail',
            auth: {
                user: 'sender@gmail.com',
                pass: 'password123'
            }
        })

        // Check that the emailTransporter object is defined
        expect(emailTransporter).toBeDefined()
    })
})
