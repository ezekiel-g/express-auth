const handleDbError = (response, error) => {
    let statusCode = 500
    let message = 'Unexpected error'

    if (error.code === 'ER_DUP_ENTRY') {
        statusCode = 400
        message = 'Duplicate entry'
    } else if (error.code === 'ER_BAD_NULL_ERROR') {
        statusCode = 400
        message = 'Missing required field'
    } else if (error.code === 'ER_DATA_TOO_LONG') {
        statusCode = 400
        message = 'Input too long for field'
    } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        statusCode = 400
        message = 'Invalid reference to another table'
    } else if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        statusCode = 409
        message = 'Cannot delete record with related records'
    }

    console.error(`Error ${error.code}: ${error.message}`)
    return response.status(statusCode).json({ message })
}

export default handleDbError
