import rateLimit from 'express-rate-limit';
import type { MiddlewareResponseHandler } from 'astro';

// Create a map to store rate limit data
const rateLimitMap = new Map();

export const rateLimiter: MiddlewareResponseHandler = async (context, next) => {
  const ip = context.clientAddress;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const max = 100; // limit each IP to 100 requests per windowMs

  const rateLimitInfo = rateLimitMap.get(ip) || {
    count: 0,
    resetTime: now + windowMs,
  };

  // Reset if window has expired
  if (now > rateLimitInfo.resetTime) {
    rateLimitInfo.count = 0;
    rateLimitInfo.resetTime = now + windowMs;
  }

  rateLimitInfo.count++;
  rateLimitMap.set(ip, rateLimitInfo);

  if (rateLimitInfo.count > max) {
    return new Response('Too many requests', {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((rateLimitInfo.resetTime - now) / 1000)),
      },
    });
  }

  return await next();
};
