import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

if (!process.env.DB_HOST) throw new Error('DB_HOST not defined in .env');
if (!process.env.DB_USER) throw new Error('DB_USER not defined in .env');
if (!process.env.DB_PASSWORD)
  throw new Error('DB_PASSWORD not defined in .env');
if (!process.env.DB_NAME) throw new Error('DB_NAME not defined in .env');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const executeQuery = async (query, params = [], rowcountNeeded = false) => {
  try {
    const [sqlResult] = await pool.execute(query, params);

    if (rowcountNeeded) return sqlResult.affectedRows ?? 0;

    return sqlResult;
  } catch (error) {
    console.error(
      `Error${error.code ? ` ${error.code}` : ''}: ${error.message}`,
    );

    if (error.stack) console.error(error.stack);

    throw error;
  }
};

const executeQuerySendResponse = async (
  response,
  statementType,
  query,
  params = [],
  successfulUpdates = [],
) => {
  try {
    const sqlResult = await executeQuery(query, params);

    if (statementType === 'SELECT') {
      if (Array.isArray(sqlResult) && sqlResult.length === 0) {
        return response.status(404).json({ message: 'No data found' });
      }

      return response.status(200).json(sqlResult);
    } else if (statementType === 'INSERT') {
      if (sqlResult.affectedRows === 0) {
        return response.status(500).json({ message: 'INSERT failed' });
      }

      return response.status(201).json({ message: 'Added successfully' });
    } else if (statementType === 'UPDATE') {
      if (sqlResult.affectedRows === 0) {
        return response.status(404).json({ message: 'UPDATE failed' });
      }

      return response.status(200).json({
        message: 'Updated successfully',
        successfulUpdates,
      });
    } else if (statementType === 'DELETE') {
      if (sqlResult.affectedRows === 0) {
        return response.status(404).json({ message: 'DELETE failed' });
      }

      return response.status(200).json({
        message: 'Deleted successfully',
      });
    }

    return response.status(200).json(sqlResult);
  } catch (error) {
    let statusCode = 500;
    let message = 'Unexpected error';

    if (error.code === 'ER_DUP_ENTRY') {
      statusCode = 400;
      message = 'Duplicate entry';
    } else if (error.code === 'ER_BAD_NULL_ERROR') {
      statusCode = 400;
      message = 'Missing required field';
    } else if (error.code === 'ER_DATA_TOO_LONG') {
      statusCode = 400;
      message = 'Input too long for field';
    } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      statusCode = 400;
      message = 'Invalid reference to another table';
    } else if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      statusCode = 409;
      message = 'Cannot delete record with related records';
    }

    return response.status(statusCode).json({ message });
  }
};

const closePool = () => {
  pool.end();
};

export default { executeQuery, executeQuerySendResponse, closePool };
