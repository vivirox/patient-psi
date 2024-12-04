import { defineMiddleware } from 'astro:middleware';
import { getUserFromRequest } from './lib/auth';

const publicPaths = [
  '/login',
  '/signup',
  '/participant-login',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/participant-login',
  '/api/auth/logout',
  '/share',
];

export const onRequest = defineMiddleware(async ({ request, redirect }, next) => {
  const url = new URL(request.url);
  const isPublicPath = publicPaths.some(path => url.pathname.startsWith(path));
  
  if (isPublicPath) {
    // Check if user is already logged in and trying to access auth pages
    const userId = await getUserFromRequest(request);
    if (userId && (url.pathname === '/login' || url.pathname === '/signup' || url.pathname === '/participant-login')) {
      return redirect('/dashboard');
    }
    return next();
  }

  // Protected routes
  const userId = await getUserFromRequest(request);
  if (!userId) {
    // API routes should return 401
    if (url.pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    // Other routes redirect to login
    return redirect('/login');
  }

  // Add user ID to request for downstream use
  request.headers.set('X-User-Id', userId);
  
  return next();
});
