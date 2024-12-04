import type { APIRoute } from 'astro';
import { redis } from '../../../lib/redis';
import { generateToken, registerSchema, setAuthCookie } from '../../../lib/auth';
import { authConfig } from '../../../lib/auth-config';
import bcrypt from 'bcryptjs';
import { nanoid } from '../../../lib/utils';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const result = registerSchema.safeParse(body);
    
    if (!result.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid registration data' }),
        { status: 400 }
      );
    }

    const { email, password, name } = result.data;
    
    // Check if user already exists
    const existingUser = await redis.hgetall(`user:${email}`);
    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'Email already registered' }),
        { status: 409 }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate unique user ID
    const userId = nanoid();

    // Create user
    await redis.hset(`user:${email}`, {
      id: userId,
      email,
      name,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    });

    // Create user index for quick lookups
    await redis.set(`userId:${userId}`, email);

    const token = generateToken(userId);
    const response = new Response(
      JSON.stringify({ 
        success: true,
        redirect: authConfig.redirects.afterLogin
      }),
      { status: 200 }
    );

    return setAuthCookie(response, token);
  } catch (error) {
    console.error('Registration error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
};
