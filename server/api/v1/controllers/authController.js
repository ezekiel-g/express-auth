import dbConnection from '../database/database.js'

const queries = {
    registerUser: `

    `,
    signInUser: `

    `,
    updateUser: `

    `,
    deleteUser: `
    
    `
}

const handleError = (response, error) => {
    let statusCode = 500
    let message = 'Unexpected error'

    if (error.code === 'ER_DUP_ENTRY') {
        statusCode = 400
        message = 'Duplicate entry'
    } else if (error.code === 'ER_BAD_NULL_ERROR') {
        statusCode = 400
        message = 'Missing required field'
    } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        statusCode = 400
        message = 'Invalid reference to another table'
    } else if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        statusCode = 409
        message = 'Cannot delete record with related records'
    }

    console.error(`Error: ${error.message}`)
    return response.status(statusCode).json({ message })
}

const registerUser = async (request, response) => {
    try {

    } catch (error) {
        return handleError(response, error)
    }
}

const signInUser = async (request, response) => {
    try {

    } catch (error) {
        return handleError(response, error)
    }    
}

const updateUser = async (request, response) => {
    try {

    } catch (error) {
        return handleError(response, error)
    }    
}

const deleteUser = async (request, response) => {
    try {

    } catch (error) {
        return handleError(response, error)
    }    
}

export default {
    registerUser,
    signInUser,
    updateUser,
    deleteUser
}
