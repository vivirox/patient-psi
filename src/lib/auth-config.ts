const AUTH_SECRET = process.env.AUTH_SECRET || 'your-secret-key';

export const authConfig = {
  secret: AUTH_SECRET,
  tokenExpiry: '7d',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  redirects: {
    login: '/login',
    signup: '/signup',
    afterLogin: '/dashboard',
    afterLogout: '/login',
  },
};
