import type { APIRoute } from 'astro';
import { redis } from '../../../lib/redis';
import { generateToken, participantLoginSchema, setAuthCookie } from '../../../lib/auth';
import { authConfig } from '../../../lib/auth-config';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const result = participantLoginSchema.safeParse(body);
    
    if (!result.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid participant ID format' }),
        { status: 400 }
      );
    }

    const { participantId } = result.data;
    
    // Check if participant exists
    const participant = await redis.hgetall(`participant:${participantId}`);
    if (!participant) {
      return new Response(
        JSON.stringify({ error: 'Invalid participant ID' }),
        { status: 401 }
      );
    }

    // Check if participant is active
    if (participant.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Participant account is not active' }),
        { status: 403 }
      );
    }

    // Update last login timestamp
    await redis.hset(`participant:${participantId}`, {
      lastLogin: new Date().toISOString()
    });

    const token = generateToken(participantId);
    const response = new Response(
      JSON.stringify({ 
        success: true,
        redirect: authConfig.redirects.afterLogin,
        participantName: participant.name
      }),
      { status: 200 }
    );

    return setAuthCookie(response, token);
  } catch (error) {
    console.error('Participant login error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
};
