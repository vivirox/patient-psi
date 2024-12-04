import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { redis } from '../../lib/redis';
import bcrypt from 'bcryptjs';
import { nanoid } from '../../lib/utils';

// Mock fetch for API calls
const BASE_URL = 'http://localhost:3000/api';

async function apiCall(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return response;
}

describe('API Integration Tests', () => {
  let testUserId: string;
  let testEmail: string;
  let authCookie: string;

  beforeAll(async () => {
    // Create test user
    testUserId = nanoid();
    testEmail = `test-${testUserId}@example.com`;
    const hashedPassword = await bcrypt.hash('password123', 10);

    await redis.hset(`user:${testEmail}`, {
      id: testUserId,
      email: testEmail,
      name: 'Test User',
      password: hashedPassword,
      role: 'therapist',
      settings: JSON.stringify({
        theme: 'light',
        notifications: true,
        language: 'en',
      }),
      metadata: '{}',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await redis.set(`userId:${testUserId}`, testEmail);

    // Login to get auth cookie
    const loginResponse = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: 'password123',
      }),
    });

    const setCookie = loginResponse.headers.get('Set-Cookie');
    authCookie = setCookie.split(';')[0];
  });

  afterAll(async () => {
    // Clean up test user
    await redis.del(`user:${testEmail}`);
    await redis.del(`userId:${testUserId}`);
    await redis.quit();
  });

  describe('Authentication Endpoints', () => {
    it('should login successfully', async () => {
      const response = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: testEmail,
          password: 'password123',
        }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Set-Cookie')).toBeDefined();

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.redirect).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const response = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: testEmail,
          password: 'wrongpassword',
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should register new user', async () => {
      const newEmail = `new-${nanoid()}@example.com`;
      const response = await apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New User',
          email: newEmail,
          password: 'password123',
        }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Set-Cookie')).toBeDefined();

      const data = await response.json();
      expect(data.success).toBe(true);

      // Clean up
      await redis.del(`user:${newEmail}`);
    });

    it('should logout successfully', async () => {
      const response = await apiCall('/auth/logout', {
        method: 'POST',
        headers: {
          Cookie: authCookie,
        },
      });

      expect(response.status).toBe(200);
      const setCookie = response.headers.get('Set-Cookie');
      expect(setCookie).toContain('token=;');
    });
  });

  describe('User Profile Endpoints', () => {
    it('should get user profile', async () => {
      const response = await apiCall('/user/profile', {
        headers: {
          Cookie: authCookie,
        },
      });

      expect(response.status).toBe(200);
      const profile = await response.json();
      expect(profile.email).toBe(testEmail);
    });

    it('should update user profile', async () => {
      const updates = {
        name: 'Updated Test User',
        settings: {
          theme: 'dark',
          notifications: false,
        },
      };

      const response = await apiCall('/user/profile', {
        method: 'PATCH',
        headers: {
          Cookie: authCookie,
        },
        body: JSON.stringify(updates),
      });

      expect(response.status).toBe(200);
      const profile = await response.json();
      expect(profile.name).toBe('Updated Test User');
      expect(profile.settings.theme).toBe('dark');
    });

    it('should require authentication', async () => {
      const response = await apiCall('/user/profile');
      expect(response.status).toBe(401);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON', async () => {
      const response = await apiCall('/auth/login', {
        method: 'POST',
        body: 'invalid json',
      });

      expect(response.status).toBe(400);
    });

    it('should handle missing required fields', async () => {
      const response = await apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          // missing password and name
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should handle rate limiting', async () => {
      // Make multiple requests in quick succession
      const requests = Array(10).fill(null).map(() =>
        apiCall('/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: testEmail,
            password: 'password123',
          }),
        })
      );

      const responses = await Promise.all(requests);
      expect(responses.some(r => r.status === 429)).toBe(true);
    });
  });
});
