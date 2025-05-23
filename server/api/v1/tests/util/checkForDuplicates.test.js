import checkForDuplicates from '../../util/checkForDuplicates.js'
import dbConnection from '../../db/dbConnection.js'

jest.mock('../../db/dbConnection.js')

describe('checkForDuplicates', () => {
    const mockResponse = {
        status: jest.fn(() => mockResponse),
        json: jest.fn(() => mockResponse)
    }

    const resetMocks = () => {
        mockResponse.status.mockClear()
        mockResponse.json.mockClear()
        dbConnection.execute.mockClear()
    }

    beforeEach(() => { resetMocks() })
    beforeAll(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {})
    })

    it('returns "pass" when no duplicates found', async () => {
        dbConnection.execute.mockResolvedValue([[]])

        const mockResult = await checkForDuplicates(mockResponse, {
            username: 'newuser',
            email: 'newuser@example.com'
        })

        expect(dbConnection.execute).toHaveBeenCalledTimes(2)
        expect(mockResult).toBe('pass')
        expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('skips columns with no corresponding query', async () => {
        dbConnection.execute.mockResolvedValue([[]])

        const mockResult = await checkForDuplicates(mockResponse, {
            testKey: 'testValue',
            username: 'user1'
        })

        expect(dbConnection.execute).toHaveBeenCalledTimes(1)
        expect(mockResult).toBe('pass')
    })

    it('returns status code 400 with error message ' +
        'if duplicate username found', async () => {
        dbConnection.execute.mockResolvedValue([[{ id: 2 }]])

        const mockResult = await checkForDuplicates(mockResponse, {
            username: 'takenuser'
        })

        expect(mockResponse.status).toHaveBeenCalledWith(400)
        expect(mockResponse.json)
            .toHaveBeenCalledWith({ messages: ['Username taken'] })
        expect(mockResult).toBe(mockResponse)
    })

    it('returns status code 400 with multiple error messages ' +
        'if duplicates found for username and email', async () => {
        dbConnection.execute
            .mockResolvedValueOnce([[{ id: 3 }]])
            .mockResolvedValueOnce([[{ id: 4 }]])

        const mockResult = await checkForDuplicates(mockResponse, {
            username: 'takenuser',
            email: 'takenuser@example.com'
        })

        expect(mockResponse.status).toHaveBeenCalledWith(400)
        expect(mockResponse.json).toHaveBeenCalledWith({
            messages: ['Username taken', 'Email address taken']
        })
        expect(mockResult).toBe(mockResponse)
    })

    it('excludes a user ID from duplicate check ' +
        'when excludeId is provided', async () => {
        dbConnection.execute.mockResolvedValue([[{ id: 5 }]])

        const mockResult = await checkForDuplicates(mockResponse, {
            username: 'sameuser'
        }, 5)

        expect(mockResult).toBe('pass')
        expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('handles database errors gracefully and returns 500', async () => {
        dbConnection.execute.mockRejectedValue(new Error('DB failure'))

        const mockResult = await checkForDuplicates(mockResponse, {
            username: 'anyuser'
        })

        expect(mockResponse.status).toHaveBeenCalledWith(500)
        expect(mockResponse.json)
            .toHaveBeenCalledWith({ message: 'Database error' })
        expect(mockResult).toBe(mockResponse)
    })
})
