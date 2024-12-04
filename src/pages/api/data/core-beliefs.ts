import type { APIRoute } from 'astro';
import { helplessBeliefItems, unlovableBeliefItems } from '../../../lib/data/core-beliefs';

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      helplessBeliefs: helplessBeliefItems,
      unlovableBeliefs: unlovableBeliefItems,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
};
