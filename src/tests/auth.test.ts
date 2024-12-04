import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { verifyToken, generateToken, getUserFromRequest } from '../lib/auth';
import { redis } from '../lib/redis';
import { getSession } from '../lib/session';

describe('Auth', () => {
  beforeEach(async () => {
    await redis.flushall();
  });

  afterEach(async () => {
    await redis.flushall();
  });

  describe('generateToken', () => {
    it('should generate a valid token with session', async () => {
      const userId = 'test-user';
      const token = await generateToken(userId, { test: true });
      expect(token).toBeDefined();

      const decoded = await verifyToken(token);
      expect(decoded.userId).toBe(userId);

      const session = await getSession(decoded.sessionId);
      expect(session).toBeDefined();
      expect(session.userId).toBe(userId);
      expect(session.data).toEqual({ test: true });
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      const userId = 'test-user';
      const token = await generateToken(userId);
      const decoded = await verifyToken(token);
      expect(decoded.userId).toBe(userId);
    });

    it('should throw error for invalid token', async () => {
      await expect(verifyToken('invalid-token')).rejects.toThrow('Invalid token');
    });

    it('should throw error for expired session', async () => {
      const userId = 'test-user';
      const token = await generateToken(userId);
      await redis.flushall();
      await expect(verifyToken(token)).rejects.toThrow('Invalid session');
    });
  });

  describe('getUserFromRequest', () => {
    it('should return userId from valid cookie', async () => {
      const userId = 'test-user';
      const token = await generateToken(userId, { test: true });
      console.log('Generated token:', token);

      const mockRequest = {
        headers: {
          get: (name: string) => name.toLowerCase() === 'cookie' ? `token=${token}` : null
        }
      } as Request;

      const result = await getUserFromRequest(mockRequest);
      expect(result).toBe(userId);
    });

    it('should return null for invalid token', async () => {
      const mockRequest = {
        headers: {
          get: (name: string) => name.toLowerCase() === 'cookie' ? 'token=invalid-token' : null
        }
      } as Request;

      const result = await getUserFromRequest(mockRequest);
      expect(result).toBeNull();
    });

    it('should return null when no token cookie present', async () => {
      const mockRequest = {
        headers: {
          get: () => null
        }
      } as Request;
      
      const result = await getUserFromRequest(mockRequest);
      expect(result).toBeNull();
    });
  });
});
