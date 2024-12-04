import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import { redis } from '../../lib/redis';
import { generateToken, verifyToken } from '../../lib/auth';
import { createSession, getSession, deleteSession, updateSession } from '../../lib/session';
import { getUserProfile, updateUserProfile } from '../../lib/user-profile';
import bcrypt from 'bcryptjs';
import { nanoid } from '../../lib/utils';

describe('Authentication and User Profile Integration Tests', () => {
  const testUserId = 'test-user-123';
  const testEmail = 'test@example.com';
  const testProfile = {
    id: testUserId,
    email: testEmail,
    name: 'Test User',
    role: 'participant' as const,
    settings: {
      theme: 'light' as const,
      notifications: true,
      language: 'en',
    },
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    // Setup test data
    await redis.set(`userId:${testUserId}`, testEmail);
    await redis.hmset(`user:${testEmail}`, {
      ...testProfile,
      settings: JSON.stringify(testProfile.settings),
      metadata: JSON.stringify(testProfile.metadata),
    });
  });

  afterEach(async () => {
    await redis.del(`userId:${testUserId}`);
    await redis.del(`user:${testEmail}`);
  });

  afterAll(async () => {
    await redis.quit();
  });

  describe('Session Management', () => {
    it('should create and verify session', async () => {
      // Create session
      const session = await createSession(testUserId);
      
      expect(session).toBeDefined();
      expect(session.userId).toBe(testUserId);

      // Verify session exists
      const retrievedSession = await getSession(session.id);
      expect(retrievedSession).toBeDefined();
      expect(retrievedSession.userId).toBe(testUserId);
    });

    it('should handle invalid session', async () => {
      const invalidSession = await getSession('invalid-session-id');
      expect(invalidSession).toBeNull();
    });

    it('should update session data', async () => {
      const session = await createSession(testUserId, { key: 'value' });
      
      expect(session.data).toEqual({ key: 'value' });

      // Update session using proper function
      const updatedSession = await updateSession(session.id, { key: 'updated' });
      expect(updatedSession.data).toEqual({ key: 'updated' });

      // Verify updated session
      const retrievedSession = await getSession(session.id);
      expect(retrievedSession.data).toEqual({ key: 'updated' });
    });
  });

  describe('Token Management', () => {
    it('should generate and verify token', async () => {
      const token = await generateToken(testUserId);
      expect(token).toBeDefined();

      const decoded = await verifyToken(token);
      expect(decoded.userId).toBe(testUserId);
    });

    it('should reject invalid token', async () => {
      await expect(verifyToken('invalid-token')).rejects.toThrow('Invalid token');
    });
  });

  describe('User Profile', () => {
    it('should get user profile', async () => {
      const profile = await getUserProfile(testUserId);
      expect(profile).toBeDefined();
      expect(profile.email).toBe(testEmail);
      expect(profile.settings.theme).toBe('light');
    });

    it('should update user profile', async () => {
      const updates = {
        name: 'Updated Name',
        settings: {
          theme: 'dark',
          notifications: false,
          language: 'es',
        },
      };

      const updatedProfile = await updateUserProfile(testUserId, updates);
      expect(updatedProfile).toBeDefined();
      expect(updatedProfile.name).toBe('Updated Name');
      expect(updatedProfile.settings.theme).toBe('dark');
      expect(updatedProfile.settings.language).toBe('es');
    });

    it('should handle invalid profile updates', async () => {
      const updates = {
        role: 'invalid-role',
      };

      await expect(updateUserProfile(testUserId, updates)).rejects.toThrow();
    });
  });
});
