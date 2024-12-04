import type { APIRoute } from 'astro';
import { sessionInstructions } from '../../../lib/data/session-instruction';

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      instructions: sessionInstructions,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
};
