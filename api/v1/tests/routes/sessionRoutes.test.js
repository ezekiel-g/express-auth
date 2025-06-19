import { describe, it, expect, beforeEach, afterEach, jest }
    from '@jest/globals'
import request from 'supertest'
import express from 'express'
import sessionRoutes from '../../routes/sessionRoutes.js'
import sessionController from '../../controllers/sessionController.js'

jest.mock('../../controllers/sessionController.js', () => ({
    readSession: jest.fn(),
    createSession: jest.fn(),
    refreshSession: jest.fn(),
    verifyTotp: jest.fn(),
    deleteSession: jest.fn()
}))

beforeEach(() => {
    sessionController.readSession.mockImplementation((request, response) => {
        response.status(200).json([{ id: 1, username: 'User1' }])
    })

    sessionController.createSession.mockImplementation((request, response) => {
        response.status(200).json({
            message: 'Signed in successfully',
            user: { id: 1, username: 'User1' }
        })
    })

    sessionController.refreshSession.mockImplementation(
        (request, response) => {
            response.status(200).json({ message: 'Session refreshed' })
        }
    )    

    sessionController.verifyTotp.mockImplementation(
        (request, response) => {
            response.status(200).json({ message: 'Signed in successfully' })
        }
    )
    
    sessionController.deleteSession.mockImplementation(
        (request, response) => {
            response.status(200).json({ message: 'Signed out successfully'})
        }
    )
})

describe('sessionRoutes', () => {
    let app

    beforeEach(() => {
        app = express()
        app.use(express.json())
        app.use('/api/v1/sessions', sessionRoutes)
    })
    afterEach(() => { jest.clearAllMocks() })

    it('handles GET /api/v1/sessions', async () => {
        const response = await request(app).get('/api/v1/sessions')
        expect(response.status).toBe(200)
    })

    it('handles POST /api/v1/sessions', async () => {
        const response = await request(app).post('/api/v1/sessions')
        expect(response.status).toBe(200)
    })

    it('handles POST /api/v1/sessions/refresh-session', async () => {
        const response =
            await request(app).post('/api/v1/sessions/refresh-session')
        expect(response.status).toBe(200)
    })    

    it('handles POST /api/v1/sessions/verify-totp', async () => {
        const response =
            await request(app).post('/api/v1/sessions/verify-totp')
        expect(response.status).toBe(200)
    })

    it('handles DELETE /api/v1/sessions', async () => {
        const response = await request(app).delete('/api/v1/sessions')
        expect(response.status).toBe(200)
    })
})
