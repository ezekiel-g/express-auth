import jsonwebtoken from 'jsonwebtoken'
import validateSession from '../../util/validateSession.js'

jest.mock('jsonwebtoken')

describe('validateSession', () => {
    const mockToken = 'valid.token.here'
    const mockDecrypted = { id: '123' }
    let mockRequest

    beforeEach(() => {
        jest.clearAllMocks()
        mockRequest = { cookies: { accessToken: mockToken } }
    })

    it('should return decoded token if valid ' +
        'and no expectedId provided', () => {
        jsonwebtoken.verify.mockReturnValue(mockDecrypted)

        const mockResult = validateSession(mockRequest)

        expect(jsonwebtoken.verify)
            .toHaveBeenCalledWith(mockToken, process.env.JWT_SECRET)
        expect(mockResult).toEqual(mockDecrypted)
    })

    it('should return true if token is valid and id matches expectedId', () => {
        jsonwebtoken.verify.mockReturnValue(mockDecrypted)

        const mockResult = validateSession(mockRequest, '123')

        expect(mockResult).toBe(true)
    })

    it('should throw 403 error if id does not match expectedId', () => {
        jsonwebtoken.verify.mockReturnValue({ id: '456' })

        expect(() => {
            validateSession(mockRequest, '123')
        }).toThrowError('Unauthorized')
    })

    it('should return null if no token is present', () => {
        const requestWithoutToken = { cookies: {} }
        const mockResult = validateSession(requestWithoutToken)

        expect(mockResult).toBeNull()
    })

    it('should throw 401 error if token is invalid or expired', () => {
        jsonwebtoken.verify.mockImplementation(() => {
            throw new jsonwebtoken.JsonWebTokenError('jwt malformed')
        })

        expect(() => {
            validateSession(mockRequest)
        }).toThrowError('Invalid or expired token')
    })

    it('should rethrow unexpected errors', () => {
        const unexpectedError = new Error('Unexpected failure')
        jsonwebtoken.verify.mockImplementation(() => { throw unexpectedError })

        expect(() => {
            validateSession(mockRequest)
        }).toThrow(unexpectedError)
    })
})
