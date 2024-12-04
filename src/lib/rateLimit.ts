import { Redis } from '@upstash/redis';
import { env } from './env';

// Initialize Redis client
const redis = new Redis({
  url: env.REDIS_URL,
  token: env.REDIS_TOKEN,
});

interface RateLimitResult {
  success: boolean;
  remaining: number;
  retryAfter: number;
}

export async function rateLimit(
  request: Request,
  options = {
    maxRequests: 20, // Maximum requests per window
    window: 60, // Time window in seconds
  }
): Promise<RateLimitResult> {
  try {
    // Get client IP
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Get user ID from auth token if available
    const token = request.headers.get('authorization')?.split(' ')[1];
    const identifier = token || ip;

    const key = `rate-limit:${identifier}`;
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - options.window;

    // Clean up old requests and add new one
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart); // Remove old entries
    pipeline.zadd(key, { score: now, member: now }); // Add current request
    pipeline.zcard(key); // Get number of requests in current window
    pipeline.expire(key, options.window); // Set key expiration

    const [, , requestCount] = await pipeline.exec();

    if (typeof requestCount !== 'number') {
      throw new Error('Invalid response from Redis');
    }

    const remaining = Math.max(0, options.maxRequests - requestCount);
    const success = requestCount <= options.maxRequests;
    const retryAfter = success ? 0 : options.window - (now - windowStart);

    // Set rate limit headers
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', options.maxRequests.toString());
    headers.set('X-RateLimit-Remaining', remaining.toString());
    headers.set('X-RateLimit-Reset', (now + retryAfter).toString());

    if (!success) {
      headers.set('Retry-After', retryAfter.toString());
    }

    return { success, remaining, retryAfter };
  } catch (error) {
    console.error('Rate limit error:', error);
    // Fail open - allow request if rate limiting fails
    return { success: true, remaining: 1, retryAfter: 0 };
  }
}

// Function to check if a specific action should be rate limited
export async function actionRateLimit(
  userId: string,
  action: string,
  options = {
    maxRequests: 5, // Maximum requests per window
    window: 60, // Time window in seconds
  }
): Promise<RateLimitResult> {
  try {
    const key = `rate-limit:${action}:${userId}`;
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - options.window;

    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zadd(key, { score: now, member: now });
    pipeline.zcard(key);
    pipeline.expire(key, options.window);

    const [, , requestCount] = await pipeline.exec();

    if (typeof requestCount !== 'number') {
      throw new Error('Invalid response from Redis');
    }

    const remaining = Math.max(0, options.maxRequests - requestCount);
    const success = requestCount <= options.maxRequests;
    const retryAfter = success ? 0 : options.window - (now - windowStart);

    return { success, remaining, retryAfter };
  } catch (error) {
    console.error('Action rate limit error:', error);
    return { success: true, remaining: 1, retryAfter: 0 };
  }
}

// Rate limit specific actions with different limits
export const rateLimits = {
  // Chat message limits
  async chatMessage(userId: string) {
    return actionRateLimit(userId, 'chat-message', {
      maxRequests: 20,
      window: 60,
    });
  },

  // New chat creation limits
  async createChat(userId: string) {
    return actionRateLimit(userId, 'create-chat', {
      maxRequests: 10,
      window: 300, // 5 minutes
    });
  },

  // Message editing limits
  async editMessage(userId: string) {
    return actionRateLimit(userId, 'edit-message', {
      maxRequests: 30,
      window: 300, // 5 minutes
    });
  },

  // Message deletion limits
  async deleteMessage(userId: string) {
    return actionRateLimit(userId, 'delete-message', {
      maxRequests: 20,
      window: 300, // 5 minutes
    });
  },

  // Chat deletion limits
  async deleteChat(userId: string) {
    return actionRateLimit(userId, 'delete-chat', {
      maxRequests: 5,
      window: 300, // 5 minutes
    });
  },
};
