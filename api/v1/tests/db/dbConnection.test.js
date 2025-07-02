import {
  describe,
  it,
  expect,
  afterAll,
  beforeEach,
  jest,
} from '@jest/globals';
import dbConnection from '../../db/dbConnection.js';
import mysql from 'mysql2/promise';

jest.mock('mysql2/promise', () => ({
  createPool: jest.fn().mockReturnValue({ execute: jest.fn() }),
}));

describe('executeQuerySendResponse', () => {
  const pool = mysql.createPool();
  let response;
  let error;

  beforeEach(() => {
    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    error = new Error('Error message');

    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.clearAllMocks();
    console.error.mockRestore();
  });

  it('executes SELECT query successfully and sends response', async () => {
    pool.execute.mockResolvedValue([[{ id: 1, name: 'name1' }]]);
    await dbConnection.executeQuerySendResponse(
      response,
      'SELECT',
      'SELECT * FROM table WHERE id = ?;',
      [1],
    );
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith([{ id: 1, name: 'name1' }]);
  });

  it('handles general query failure and sends response', async () => {
    pool.execute.mockRejectedValue(error);
    await dbConnection.executeQuerySendResponse(
      response,
      'SELECT',
      'SELECT * FROM table WHERE id = ?;',
      [1],
    );
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({ message: 'Unexpected error' });
  });

  it('executes INSERT query successfully and sends response', async () => {
    pool.execute.mockResolvedValue([{ affectedRows: 1 }]);
    await dbConnection.executeQuerySendResponse(
      response,
      'INSERT',
      'INSERT INTO table (name) VALUES (?);',
      ['Sample name'],
    );
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith({
      message: 'Added successfully',
    });
  });

  it('handles ER_DUP_ENTRY error for INSERT and sends response', async () => {
    error.code = 'ER_DUP_ENTRY';

    pool.execute.mockRejectedValue(error);
    await dbConnection.executeQuerySendResponse(
      response,
      'INSERT',
      'INSERT INTO table (name) VALUES (?);',
      ['Sample name'],
    );
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: 'Duplicate entry' });
  });

  it('executes UPDATE query successfully and sends response', async () => {
    pool.execute.mockResolvedValue([{ affectedRows: 1 }]);
    await dbConnection.executeQuerySendResponse(
      response,
      'UPDATE',
      'UPDATE table SET name = ? WHERE id = ?;',
      ['Updated name', 1],
    );
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      message: 'Updated successfully',
      successfulUpdates: [],
    });
  });

  it('handles ER_BAD_NULL_ERROR for UPDATE and sends response', async () => {
    error.code = 'ER_BAD_NULL_ERROR';

    pool.execute.mockRejectedValue(error);
    await dbConnection.executeQuerySendResponse(
      response,
      'UPDATE',
      'UPDATE table SET name = ? WHERE id = ?;',
      [null, 1],
    );
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      message: 'Missing required field',
    });
  });

  it('executes DELETE query successfully and sends response', async () => {
    pool.execute.mockResolvedValue([{ affectedRows: 1 }]);
    await dbConnection.executeQuerySendResponse(
      response,
      'DELETE',
      'DELETE FROM table WHERE id = ?;',
      [1],
    );
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      message: 'Deleted successfully',
    });
  });
});
