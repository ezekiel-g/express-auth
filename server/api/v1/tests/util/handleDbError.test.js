import handleDbError from '../../util/handleDbError.js'

describe('handleDbError', () => {
    const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    }

    beforeEach(() => {
        jest.clearAllMocks()
        jest.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterAll(() => { console.error.mockRestore() })

    it('should handle MySQL error with code and return appropriate ' +
        'status and message', () => {
        const mockError = {
            code: 'ER_DUP_ENTRY',
            message: 'Duplicate entry error'
        }

        handleDbError(mockResponse, mockError)

        expect(mockResponse.status).toHaveBeenCalledWith(400)
        expect(mockResponse.json)
            .toHaveBeenCalledWith({ message: 'Duplicate entry' })
    })

    it('should handle error without a code and return status 500 ' +
        'with "Unexpected error" message', () => {
        const mockError = {
            message: 'Some generic error'
        }

        handleDbError(mockResponse, mockError)

        expect(mockResponse.status).toHaveBeenCalledWith(500)
        expect(mockResponse.json)
            .toHaveBeenCalledWith({ message: 'Unexpected error' })
    })

    it('should log the error to the console', () => {
        const mockError = {
            code: 'ER_DUP_ENTRY',
            message: 'Duplicate entry error'
        }

        handleDbError(mockResponse, mockError)

        expect(console.error).
            toHaveBeenCalledWith('Error ER_DUP_ENTRY: Duplicate entry error')
    })
})
