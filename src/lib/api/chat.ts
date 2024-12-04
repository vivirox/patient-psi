import { redis } from '../redis';
import type { Chat } from '../types';

export async function getSharedChat(id: string): Promise<Chat | null> {
  try {
    const chat = await redis.hgetall<Chat>(`chat:${id}`);
    
    if (!chat || !chat.sharePath) {
      return null;
    }

    return chat;
  } catch (error) {
    console.error('Error getting shared chat:', error);
    return null;
  }
}

export async function shareChat(id: string, userId: string): Promise<string | null> {
  try {
    const chat = await redis.hgetall<Chat>(`chat:${id}`);

    if (!chat || chat.userId !== userId) {
      return null;
    }

    const sharePath = nanoid();
    await redis.hset(`chat:${id}`, {
      sharePath,
    });

    return sharePath;
  } catch (error) {
    console.error('Error sharing chat:', error);
    return null;
  }
}
