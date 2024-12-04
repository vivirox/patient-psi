import type { APIRoute } from 'astro';
import { clearAuthCookie } from '../../../lib/auth';
import { authConfig } from '../../../lib/auth-config';

export const POST: APIRoute = async () => {
  const response = new Response(
    JSON.stringify({ 
      success: true,
      redirect: authConfig.redirects.afterLogout
    }),
    { status: 200 }
  );
  
  response.headers.set('Set-Cookie', clearAuthCookie());
  return response;
};
