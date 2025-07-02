import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import request from 'supertest';
import express from 'express';
import userRoutes from '../../routes/userRoutes.js';
import userController from '../../controllers/userController.js';

jest.mock('../../controllers/userController.js', () => ({
  readUsers: jest.fn(),
  readUser: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
}));

beforeEach(() => {
  userController.readUsers.mockImplementation((req, res) => {
    res.status(200).json([
      { id: 1, username: 'User1' },
      { id: 2, username: 'User2' },
    ]);
  });

  userController.readUser.mockImplementation((req, res) => {
    res.status(200).json({
      id: req.params.id,
      username: 'User1',
    });
  });

  userController.createUser.mockImplementation((req, res) => {
    res.status(201).json(req.body);
  });

  userController.updateUser.mockImplementation((req, res) => {
    res
      .status(200)
      .json(Object.assign({}, { id: req.params.id }, req.body));
  });

  userController.deleteUser.mockImplementation((req, res) => {
    res.status(200).json({ message: 'Account deleted successfully' });
  });
});

describe('userRoutes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/users', userRoutes);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('handles GET /api/v1/users', async () => {
    const response = await request(app).get('/api/v1/users');
    expect(response.status).toBe(200);
  });

  it('handles GET /api/v1/users/:id', async () => {
    const response = await request(app).get('/api/v1/users/1');
    expect(response.status).toBe(200);
  });

  it('handles POST /api/v1/users', async () => {
    const response = await request(app).post('/api/v1/users');
    expect(response.status).toBe(201);
  });

  it('handles PATCH /api/v1/users', async () => {
    const response = await request(app).patch('/api/v1/users');
    expect(response.status).toBe(200);
  });

  it('handles DELETE /api/v1/users', async () => {
    const response = await request(app).delete('/api/v1/users');
    expect(response.status).toBe(200);
  });
});
