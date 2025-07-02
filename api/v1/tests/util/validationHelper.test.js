import { describe, it, expect, afterEach, jest } from '@jest/globals';
import dbConnection from '../../db/dbConnection.js';
import validationHelper from '../../util/validationHelper.js';

jest.mock('../../db/dbConnection.js', () => ({ executeQuery: jest.fn() }));

const sqlQueryFunction = jest.fn();

describe('validationHelper', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('fetches users using fetchFromBackEnd', async () => {
      const users = [
        { id: 1, username: 'User1' },
        { id: 2, username: 'User2' },
      ];

      dbConnection.executeQuery.mockResolvedValueOnce(users);

      const sqlResult = await validationHelper.getUsers();

      expect(sqlResult).toEqual(users);
    });
  });

  describe('checkForDuplicate', () => {
    it('returns "pass" when no results returned from query', async () => {
      sqlQueryFunction.mockResolvedValueOnce([]);

      const duplicateCheck = await validationHelper.checkForDuplicate(
        { username: 'User1' },
        sqlQueryFunction,
      );

      expect(duplicateCheck).toBe('pass');
    });

    it('returns "pass" when no duplicate is found', async () => {
      sqlQueryFunction.mockResolvedValueOnce([
        { id: 2, username: 'User2' },
        { id: 3, username: 'User3' },
      ]);

      const duplicateCheck = await validationHelper.checkForDuplicate(
        { username: 'User1' },
        sqlQueryFunction,
      );

      expect(duplicateCheck).toBe('pass');
    });

    it('returns "fail" when a duplicate is found', async () => {
      sqlQueryFunction.mockResolvedValueOnce([
        { id: 1, username: 'User1' },
        { id: 2, username: 'User2' },
      ]);

      const duplicateCheck = await validationHelper.checkForDuplicate(
        { username: 'User1' },
        sqlQueryFunction,
      );

      expect(duplicateCheck).toBe('fail');
    });

    it('excludes the ID when one is passed in', async () => {
      sqlQueryFunction.mockResolvedValueOnce([
        { id: 1, username: 'User1' },
        { id: 2, username: 'User2' },
      ]);

      const duplicateCheck = await validationHelper.checkForDuplicate(
        { username: 'User1' },
        sqlQueryFunction,
        1,
      );

      expect(duplicateCheck).toBe('pass');
    });
  });

  describe('returnSuccess', () => {
    it('returns success message when current value is different', () => {
      const validationResult = validationHelper.returnSuccess(
        'Username',
        'User1',
        'User2',
      );

      expect(validationResult).toEqual({
        valid: true,
        message: 'Username updated successfully',
      });
    });

    it('returns no message when current value is the same', () => {
      const validationResult = validationHelper.returnSuccess(
        'Username',
        'User1',
        'User1',
      );

      expect(validationResult).toEqual({
        valid: true,
        message: null,
      });
    });

    it('returns no message if current value is null', () => {
      const validationResult = validationHelper.returnSuccess(
        'Username',
        'User1',
        null,
      );

      expect(validationResult).toEqual({
        valid: true,
        message: null,
      });
    });

    it('returns no message if current value is undefined', () => {
      const validationResult = validationHelper.returnSuccess(
        'Username',
        'User1',
        undefined,
      );

      expect(validationResult).toEqual({
        valid: true,
        message: null,
      });
    });
  });
});
