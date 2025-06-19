import { describe, it, expect, beforeEach, afterEach, jest }
    from '@jest/globals'
import crypto from 'crypto'
import userController from '../../controllers/userController.js'
import dbConnection from '../../db/dbConnection.js'
import validateUser from '../../util/validateUser.js'
import validateSession from '../../util/validateSession.js'
import emailTransporter from '../../util/emailTransporter.js'

jest.mock('crypto')
jest.mock('../../db/dbConnection.js')
jest.mock('../../util/validateUser.js')
jest.mock('../../util/validateSession.js')
jest.mock('../../util/emailTransporter.js')
jest.mock('nodemailer', () => ({
    createTransport: jest.fn(() => ({
        sendMail: jest.fn().mockResolvedValue('Email sent successfully')
    }))
}))

describe('userController', () => {
    let request
    let response
    
    beforeEach(() => {
        request = {}
        response = {
            send: jest.fn(),
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        }
    })

    afterEach(() => { jest.clearAllMocks() })

    describe('readUsers', () => {
        it('sends all user data', async () => {
            dbConnection.executeQuerySendResponse.mockResolvedValueOnce({
                rows: [
                    { id: 1, username: 'User1' },
                    { id: 2, username: 'User2' }
                ]
            })
            await userController.readUsers(request, response)
            
            expect(dbConnection.executeQuerySendResponse).toHaveBeenCalledWith(
                response,
                'SELECT',
                expect.stringContaining('SELECT * FROM')
            )
        })
    })

    describe('readUser', () => {
        it('sends specific user data', async () => {
            request.params = { id: 1 }

            dbConnection.executeQuerySendResponse
                .mockResolvedValueOnce({ rows: [{ id: 1, username: 'User1' }] })
            await userController.readUser(request, response)

            expect(dbConnection.executeQuerySendResponse).toHaveBeenCalledWith(
                response,
                'SELECT',
                expect.stringContaining('SELECT * FROM'),
                [1]
            )
        })
    })

    describe('createUser', () => {
        it('creates user successfully, sends verification email', async () => {
            request.body = {
                username: 'User1',
                email: 'user1@example.com',
                password: 'Password&123456789'
            }

            validateUser.mockResolvedValueOnce({
                valid: true,
                queryParams: ['User1', 'user1@example.com', 'Password&1234567'],
                queryFields: ['username', 'email', 'password'],
                successfulUpdates: ['Message1', 'Message2', 'Message3']
            })

            dbConnection.executeQuery.mockResolvedValueOnce({ insertId: 1 })
            emailTransporter.sendMail.mockResolvedValueOnce('Email sent')
            crypto.randomBytes.mockReturnValueOnce(Buffer.from('123456'))

            await userController.createUser(request, response)

            expect(dbConnection.executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO users'),
                ['User1', 'user1@example.com', 'Password&1234567']
            )
            expect(emailTransporter.sendMail).toHaveBeenCalled()
            expect(response.status).toHaveBeenCalledWith(201)
            expect(response.json).toHaveBeenCalled()
        })
    })

    describe('updateUser', () => {
        it('updates user successfully and sends email change confirmation ' +
            'if email changed', async () => {
            request.body = {
                id: 1,
                username: 'UpdatedUser',
                email: 'updated@example.com'
            }

            validateSession.mockReturnValueOnce(true)

            validateUser.mockResolvedValueOnce({
                valid: true,
                queryParams: ['UpdatedUser', 'updated@example.com', 1],
                queryFields: ['username = ?', 'email = ?'],
                successfulUpdates: ['Username updated', 'Email updated']
            })

            dbConnection.executeQuery
                .mockResolvedValueOnce([
                    {
                        id: 1,
                        username: 'OldUser',
                        email: 'old@example.com',
                        email_change_token: null,
                        token_expires: null
                    }
                ])
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce([
                    {
                        id: 1,
                        username: 'UpdatedUser',
                        email: 'updated@example.com',
                        role: 'user',
                        account_verified: 1,
                        totp_auth_on: 0,
                        created_at: new Date()
                    }
                ])

            crypto.randomBytes.mockReturnValueOnce(Buffer.from('tokenValue'))
            emailTransporter.sendMail.mockResolvedValueOnce('Email sent')

            await userController.updateUser(request, response)

            expect(dbConnection.executeQuery).toHaveBeenCalled()
            expect(dbConnection.executeQuery).toHaveBeenCalled()
            expect(emailTransporter.sendMail).toHaveBeenCalled()
            expect(response.status).toHaveBeenCalledWith(200)
            expect(response.json).toHaveBeenCalled()
        })
    })

    describe('deleteUser', () => {
        it('deletes user successfully when provided valid token', async () => {
            request.query = 'validToken'
            dbConnection.executeQuery
                .mockResolvedValueOnce([{ 
                    id: 1,
                    expires_at: new Date(Date.now() + 1000)
                }])
                .mockResolvedValueOnce([{ id: 1 }])

            await userController.deleteUser(request, response)

            expect(dbConnection.executeQuery).toHaveBeenCalled()
            expect(dbConnection.executeQuery).toHaveBeenCalled()
            expect(response.status).toHaveBeenCalledWith(200)
            expect(response.json).toHaveBeenCalled()
        })
    })
})
