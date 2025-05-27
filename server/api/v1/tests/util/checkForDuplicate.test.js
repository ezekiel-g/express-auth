import checkForDuplicate from '../../util/checkForDuplicate.js'

describe('checkForDuplicate', () => {
    it('should return "pass" when no rows are returned', async () => {
        const mockFetchFunction = jest.fn().mockResolvedValue([])
        const entryObject = { username: 'newuser' }
        const result = await checkForDuplicate(entryObject, mockFetchFunction)

        expect(result).toBe('pass')
    })

    it('should return "fail" when a duplicate is found', async () => {
        const mockFetchFunction = jest.fn().mockResolvedValue([
            { id: 1, username_ci: 'newuser' },
            { id: 2, username_ci: 'anotheruser' }
        ])

        const entryObject = { username: 'newUser' }
        const result = await checkForDuplicate(entryObject, mockFetchFunction)

        expect(result).toBe('fail')
    })

    it('should return "pass" when no duplicate is found', async () => {
        const mockFetchFunction = jest.fn().mockResolvedValue([
            { id: 1, username_ci: 'user1' },
            { id: 2, username_ci: 'user2' }
        ])

        const entryObject = { username: 'newUser' }
        const result = await checkForDuplicate(entryObject, mockFetchFunction)

        expect(result).toBe('pass')
    })

    it('should return "pass" when a duplicate is found but ' +
        'it is the same entry being updated', async () => {
        const mockFetchFunction = jest.fn().mockResolvedValue([
            { id: 1, username_ci: 'newuser' },
            { id: 2, username_ci: 'anotheruser' }
        ])

        const entryObject = { username: 'newUser' }
        const excludeIdForUpdate = 1

        const result = await checkForDuplicate(
            entryObject,
            mockFetchFunction,
            excludeIdForUpdate
        )

        expect(result).toBe('pass')
    })
})
