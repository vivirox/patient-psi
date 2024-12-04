import type { APIRoute } from 'astro';
import { initialProfile } from '../../../lib/data/patient-profiles';

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      initialProfile,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
};
