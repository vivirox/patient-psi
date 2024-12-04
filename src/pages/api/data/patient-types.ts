import type { APIRoute } from 'astro';
import { patientTypes } from '../../../lib/data/patient-types';

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      patientTypes,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
};
