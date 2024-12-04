import type { APIRoute } from 'astro';
import { redis } from '../../../lib/redis';
import { generateToken, loginSchema, setAuthCookie } from '../../../lib/auth';
import { authConfig } from '../../../lib/auth-config';
import bcrypt from 'bcryptjs';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const result = loginSchema.safeParse(body);
    
    if (!result.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid email or password format' }),
        { status: 400 }
      );
    }

    const { email, password } = result.data;
    const user = await redis.hgetall(`user:${email}`);

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Invalid email or password' }),
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return new Response(
        JSON.stringify({ error: 'Invalid email or password' }),
        { status: 401 }
      );
    }

    const token = generateToken(user.id);
    const response = new Response(
      JSON.stringify({ 
        success: true,
        redirect: authConfig.redirects.afterLogin
      }),
      { status: 200 }
    );

    return setAuthCookie(response, token);
  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
};
