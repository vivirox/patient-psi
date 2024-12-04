import type { APIContext } from 'astro';
import { getUserFromRequest } from '../lib/auth';

export async function authMiddleware({ request }: APIContext) {
  const userId = await getUserFromRequest(request);
  if (!userId) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
    });
  }
  return userId;
}

export async function protectRoute({ request }: { request: Request }) {
  const userId = await getUserFromRequest(request);
  if (!userId) {
    return {
      redirect: true,
      url: '/login',
    };
  }
  return {
    redirect: false,
    userId,
  };
}

export async function redirectIfAuthenticated({ request }: { request: Request }) {
  const userId = await getUserFromRequest(request);
  if (userId) {
    return {
      redirect: true,
      url: '/dashboard',
    };
  }
  return {
    redirect: false,
    userId: null,
  };
}
