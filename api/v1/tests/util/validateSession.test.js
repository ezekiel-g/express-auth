import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import jsonwebtoken from 'jsonwebtoken'
import validateSession from '../../util/validateSession.js'

jest.mock('jsonwebtoken')

describe('validateSession', () => {
    const token = 'valid.token.here'
    const decryptedToken = { id: '123' }
    let request

    beforeEach(() => { request = { cookies: { accessToken: token } } })

    afterEach(() => { jest.clearAllMocks() })

    it('returns decoded token if valid and no expectedId provided', () => {
        jsonwebtoken.verify.mockReturnValue(decryptedToken)

        const mockResult = validateSession(request)

        expect(jsonwebtoken.verify)
            .toHaveBeenCalledWith(token, process.env.JWT_SECRET)
        expect(mockResult).toEqual(decryptedToken)
    })

    it('returns true if token is valid and id matches expectedId', () => {
        jsonwebtoken.verify.mockReturnValue(decryptedToken)

        const mockResult = validateSession(request, '123')

        expect(mockResult).toBe(true)
    })

    it('throws 403 error if id does not match expectedId', () => {
        jsonwebtoken.verify.mockReturnValue({ id: '456' })

        expect(() => {
            validateSession(request, '123')
        }).toThrowError('Unauthorized')
    })

    it('returns null if no token is present', () => {
        const requestWithoutToken = { cookies: {} }
        const mockResult = validateSession(requestWithoutToken)

        expect(mockResult).toBeNull()
    })

    it('throws 401 error if token is invalid or expired', () => {
        jsonwebtoken.verify.mockImplementation(() => {
            throw new jsonwebtoken.JsonWebTokenError('jwt malformed')
        })

        expect(() => {
            validateSession(request)
        }).toThrowError('Invalid or expired token')
    })

    it('rethrows unexpected errors', () => {
        const unexpectedError = new Error('Unexpected failure')
        jsonwebtoken.verify.mockImplementation(() => { throw unexpectedError })

        expect(() => {
            validateSession(request)
        }).toThrow(unexpectedError)
    })
})
