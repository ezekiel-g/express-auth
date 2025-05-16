import dbConnection from '../database/database.js'

const queries = {
    username: {
        query: 'SELECT id FROM users WHERE username = ?;',
        errorMessage: 'Username taken'
    },
    email: {
        query: 'SELECT id FROM users WHERE email = ?;',
        errorMessage: 'Email address taken'
    }
}

const checkForDuplicates = async (response, entries = {}, excludeId = null) => {
    const columnNames = Object.keys(entries)
    const duplicateEntryErrors = []
    
    for (let i = 0; i < columnNames.length; i++) {
        const columnName = columnNames[i]
        const value = entries[columnName]
        
        if (!value) continue

        const queryInfo = queries[columnName]

        if (!queryInfo) continue
        
        const [rows] = await dbConnection.execute(queryInfo.query, [value])
    
        if (
            rows.length > 0 &&
            (!excludeId || rows[0].id !== Number(excludeId))
        ) {
            duplicateEntryErrors.push(queryInfo.errorMessage)
        }
    }

    if (duplicateEntryErrors.length > 0) {
        return response.status(400).json({ messages: duplicateEntryErrors })
    }

    return 'pass'
}

export default checkForDuplicates
