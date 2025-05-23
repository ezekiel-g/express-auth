import dbConnection from '../db/dbConnection.js'

const queries = {
    username: {
        query: 'SELECT id FROM users WHERE username_ci = ?;',
        errorMessage: 'Username taken'
    },
    email: {
        query: 'SELECT id FROM users WHERE email_ci = ?;',
        errorMessage: 'Email address taken'
    }
}

const checkForDuplicates = async (response, entries = {}, excludeId = null) => {
    const columnNames = Object.keys(entries)
    const duplicateEntryErrors = []
    
    for (let i = 0; i < columnNames.length; i++) {
        const columnName = columnNames[i]
        const value = entries[columnName]?.toLowerCase()
        
        if (!value) continue

        const queryInfo = queries[columnName]

        if (!queryInfo) continue
        
        try {
            const [rows] = await dbConnection.execute(queryInfo.query, [value])
    
            if (
                rows.length > 0 &&
                (!excludeId || rows[0].id !== Number(excludeId))
            ) {
                duplicateEntryErrors.push(queryInfo.errorMessage)
            }
        } catch (error) {
            console.error('Error:', error.message)
            return response.status(500).json({ message: 'Database error' })
        }
    }

    if (duplicateEntryErrors.length > 0) {
        return response.status(400).json({ messages: duplicateEntryErrors })
    }

    return 'pass'
}

export default checkForDuplicates
