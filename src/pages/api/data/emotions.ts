import type { APIRoute } from 'astro';
import { emotionItems } from '../../../lib/data/emotions';

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      emotions: emotionItems,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
};
