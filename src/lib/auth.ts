import jwt from 'jsonwebtoken';
import { authConfig } from './auth-config';
import { z } from 'zod';
import { createSession, getSession, deleteSession, clearUserSessions } from './session';

const AUTH_SECRET = authConfig.secret;

interface TokenPayload {
  userId: string;
  sessionId: string;
  iat: number;
  exp: number;
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  try {
    const decoded = jwt.verify(token, AUTH_SECRET) as TokenPayload;
    
    // Verify session exists and is valid
    const session = await getSession(decoded.sessionId);
    if (!session) {
      throw new Error('Invalid session');
    }
    
    return decoded;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Invalid session') {
        throw error;
      }
      // Handle JWT specific errors
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token: ' + error.message);
      }
    }
    throw new Error('Invalid token');
  }
}

export async function generateToken(userId: string, data: Record<string, any> = {}): Promise<string> {
  // Create a new session
  const session = await createSession(userId, data);
  
  const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
    userId,
    sessionId: session.id,
  };
  
  return jwt.sign(
    payload,
    AUTH_SECRET,
    { expiresIn: authConfig.tokenExpiry }
  );
}

export async function getUserFromRequest(request: Request): Promise<string | null> {
  try {
    const cookieHeader = request.headers.get('cookie');
    console.log('Cookie header:', cookieHeader);
    if (!cookieHeader) return null;

    // Parse cookies into an object
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(cookie => {
        const [key, ...valueParts] = cookie.trim().split('=');
        return [key.trim(), valueParts.join('=')];
      })
    );
    console.log('Parsed cookies:', cookies);

    const token = cookies['token'];
    console.log('Found token:', token);
    if (!token) return null;

    const decoded = await verifyToken(token);
    console.log('Decoded token:', decoded);
    return decoded.userId;
  } catch (error) {
    console.error('Error in getUserFromRequest:', error);
    return null;
  }
}

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = loginSchema.extend({
  name: z.string().min(2),
});

export const participantLoginSchema = z.object({
  participantId: z.string().min(1),
});

export function setAuthCookie(response: Response, token: string): Response {
  const cookie = `token=${token}; ${Object.entries(authConfig.cookieOptions)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ')}`;
  
  response.headers.set('Set-Cookie', cookie);
  return response;
}

export async function clearAuthCookie(userId: string): Promise<string> {
  // Clear all user sessions
  await clearUserSessions(userId);
  
  return `token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`;
}
