import dotenv from 'dotenv'
import mysql from 'mysql2'

dotenv.config()

jest.mock('mysql2', () => {
    const mockPromise = jest.fn(() => 'mockPromise')
    const mockCreatePool = jest.fn(() => ({
        promise: mockPromise
    }))

    return {
        createPool: mockCreatePool
    }
})

import dbConnection from '../../db/dbConnection.js'

describe('dbConnection', () => {
    it(
        'should create a mysql pool with correct credentials ' +
            'and export a promise',
        () => {
            expect(mysql.createPool).toHaveBeenCalledWith({
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            })

            expect(dbConnection).toBe('mockPromise')
        }
    )
})
