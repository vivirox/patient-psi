import { nanoid } from './utils';
import { redis } from './redis';

export interface Session {
  id: string;
  userId: string;
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days in seconds

export async function createSession(userId: string, data: Record<string, any> = {}): Promise<Session> {
  const session: Session = {
    id: nanoid(),
    userId,
    data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await redis.hmset(`session:${session.id}`, {
    ...session,
    data: JSON.stringify(data),
  });
  await redis.expire(`session:${session.id}`, SESSION_TTL);
  
  // Index session by user ID for quick lookups
  await redis.sadd(`user:${userId}:sessions`, session.id);
  
  return session;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const sessionData = await redis.hgetall(`session:${sessionId}`);
  if (!sessionData || !Object.keys(sessionData).length) {
    return null;
  }

  // Update last access time
  const now = new Date().toISOString();
  await redis.hset(`session:${sessionId}`, 'updatedAt', now);
  await redis.expire(`session:${sessionId}`, SESSION_TTL);
  
  return {
    ...sessionData,
    data: JSON.parse(sessionData.data || '{}'),
  } as Session;
}

export async function updateSession(sessionId: string, data: Record<string, any>): Promise<Session | null> {
  const session = await getSession(sessionId);
  if (!session) {
    return null;
  }

  const updatedSession: Session = {
    ...session,
    data: {
      ...session.data,
      ...data,
    },
    updatedAt: new Date().toISOString(),
  };

  await redis.hmset(`session:${sessionId}`, {
    ...updatedSession,
    data: JSON.stringify(updatedSession.data),
  });
  
  return updatedSession;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) return;
  
  await redis.del(`session:${sessionId}`);
  await redis.srem(`user:${session.userId}:sessions`, sessionId);
}

export async function getUserSessions(userId: string): Promise<Session[]> {
  const sessionIds = await redis.smembers(`user:${userId}:sessions`);
  const sessions = await Promise.all(
    sessionIds.map(id => getSession(id))
  );
  
  return sessions.filter((s): s is Session => s !== null);
}

export async function clearUserSessions(userId: string): Promise<void> {
  const sessions = await getUserSessions(userId);
  await Promise.all(
    sessions.map(session => deleteSession(session.id))
  );
}
