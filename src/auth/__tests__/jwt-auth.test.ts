import { AuthService } from '../jwt-auth';
import { query } from '../../models/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../models/database');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthService', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password_hash: 'hashed_password',
    name: 'Test User',
    role: 'user',
    created_at: new Date(),
    updated_at: new Date()
  };

  const mockToken = 'mock.jwt.token';
  const JWT_SECRET = 'test-secret';
  const SESSION_SECRET = 'session-secret';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.SESSION_SECRET = SESSION_SECRET;
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.SESSION_SECRET;
  });

  describe('authenticate', () => {
    it('should return token for valid credentials', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [mockUser],
        rowCount: 1
      } as any);

      mockedBcrypt.compare.mockResolvedValueOnce(true as never);
      mockedJwt.sign.mockReturnValue(mockToken as any);

      const token = await AuthService.authenticate('test@example.com', 'password123');

      expect(token).toBe(mockToken);
      expect(mockedQuery).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1',
        ['test@example.com']
      );
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('password123', 'hashed_password');
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        {
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user'
        },
        JWT_SECRET,
        { expiresIn: '8h' }
      );
    });

    it('should return null for non-existent user', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      } as any);

      const token = await AuthService.authenticate('nonexistent@example.com', 'password');

      expect(token).toBeNull();
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
      expect(mockedJwt.sign).not.toHaveBeenCalled();
    });

    it('should return null for invalid password', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [mockUser],
        rowCount: 1
      } as any);

      mockedBcrypt.compare.mockResolvedValueOnce(false as never);

      const token = await AuthService.authenticate('test@example.com', 'wrongpassword');

      expect(token).toBeNull();
      expect(mockedJwt.sign).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockedQuery.mockRejectedValueOnce(new Error('Database error'));

      const token = await AuthService.authenticate('test@example.com', 'password');

      expect(token).toBeNull();
    });

    it('should handle missing JWT_SECRET', async () => {
      delete process.env.JWT_SECRET;
      delete process.env.SESSION_SECRET;

      mockedQuery.mockResolvedValueOnce({
        rows: [mockUser],
        rowCount: 1
      } as any);

      mockedBcrypt.compare.mockResolvedValueOnce(true as never);

      const token = await AuthService.authenticate('test@example.com', 'password');

      expect(token).toBeNull();
      expect(mockedJwt.sign).not.toHaveBeenCalled();
    });
  });

  describe('verifyToken', () => {
    const mockPayload = {
      userId: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    };

    it('should return payload for valid token', () => {
      mockedJwt.verify.mockReturnValue(mockPayload as any);

      const result = AuthService.verifyToken(mockToken);

      expect(result).toEqual(mockPayload);
      expect(mockedJwt.verify).toHaveBeenCalledWith(mockToken, JWT_SECRET);
    });

    it('should return null for invalid token', () => {
      mockedJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = AuthService.verifyToken('invalid.token');

      expect(result).toBeNull();
    });

    it('should return null for expired token', () => {
      mockedJwt.verify.mockImplementation(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date());
      });

      const result = AuthService.verifyToken('expired.token');

      expect(result).toBeNull();
    });

    it('should handle missing JWT_SECRET', () => {
      delete process.env.JWT_SECRET;
      delete process.env.SESSION_SECRET;

      const result = AuthService.verifyToken(mockToken);

      expect(result).toBeNull();
      expect(mockedJwt.verify).not.toHaveBeenCalled();
    });
  });

  describe('createUser', () => {
    it('should create user with hashed password', async () => {
      const hashedPassword = 'bcrypt_hashed_password';
      mockedBcrypt.hash.mockResolvedValueOnce(hashedPassword as never);

      mockedQuery.mockResolvedValueOnce({
        rows: [{
          id: 'new-user-id',
          email: 'newuser@example.com',
          name: 'New User',
          role: 'user',
          created_at: new Date()
        }],
        rowCount: 1
      } as any);

      const user = await AuthService.createUser(
        'newuser@example.com',
        'password123',
        'New User'
      );

      expect(user).toEqual({
        id: 'new-user-id',
        email: 'newuser@example.com',
        name: 'New User',
        role: 'user'
      });

      expect(mockedBcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        ['newuser@example.com', hashedPassword, 'New User', 'user']
      );
    });

    it('should handle duplicate email', async () => {
      mockedBcrypt.hash.mockResolvedValueOnce('hashed' as never);
      mockedQuery.mockRejectedValueOnce({
        code: '23505',
        message: 'Unique constraint violation'
      });

      const user = await AuthService.createUser(
        'duplicate@example.com',
        'password',
        'User'
      );

      expect(user).toBeNull();
    });

    it('should handle database errors', async () => {
      mockedBcrypt.hash.mockResolvedValueOnce('hashed' as never);
      mockedQuery.mockRejectedValueOnce(new Error('Database error'));

      const user = await AuthService.createUser(
        'user@example.com',
        'password',
        'User'
      );

      expect(user).toBeNull();
    });
  });

  describe('getUserById', () => {
    it('should return user for valid ID', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [mockUser],
        rowCount: 1
      } as any);

      const user = await AuthService.getUserById('user-123');

      expect(user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role
      });

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, email, name, role FROM users WHERE id = $1'),
        ['user-123']
      );
    });

    it('should return null for non-existent user', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      } as any);

      const user = await AuthService.getUserById('nonexistent');

      expect(user).toBeNull();
    });

    it('should handle database errors', async () => {
      mockedQuery.mockRejectedValueOnce(new Error('Database error'));

      const user = await AuthService.getUserById('user-123');

      expect(user).toBeNull();
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1
      } as any);

      await AuthService.updateLastLogin('user-123');

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1'),
        ['user-123']
      );
    });

    it('should handle database errors silently', async () => {
      mockedQuery.mockRejectedValueOnce(new Error('Database error'));

      // Should not throw
      await expect(AuthService.updateLastLogin('user-123')).resolves.not.toThrow();
    });
  });

  describe('validatePassword', () => {
    it('should return true for valid password', async () => {
      mockedBcrypt.compare.mockResolvedValueOnce(true as never);

      const isValid = await AuthService.validatePassword('password123', 'hashed_password');

      expect(isValid).toBe(true);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('password123', 'hashed_password');
    });

    it('should return false for invalid password', async () => {
      mockedBcrypt.compare.mockResolvedValueOnce(false as never);

      const isValid = await AuthService.validatePassword('wrongpassword', 'hashed_password');

      expect(isValid).toBe(false);
    });

    it('should handle bcrypt errors', async () => {
      mockedBcrypt.compare.mockRejectedValueOnce(new Error('Bcrypt error'));

      const isValid = await AuthService.validatePassword('password', 'hash');

      expect(isValid).toBe(false);
    });
  });
});