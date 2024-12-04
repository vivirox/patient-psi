import type { APIRoute } from 'astro';
import { db } from '../../../../../../lib/db';
import { messages, chats } from '../../../../../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { verifyToken } from '../../../../../../lib/auth';

export const GET: APIRoute = async ({ params, request }) => {
  try {
    const token = request.headers.get('Cookie')?.split('token=')[1];
    if (!token) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
      });
    }

    const decoded = await verifyToken(token);
    
    // Verify chat belongs to user
    const [chat] = await db
      .select()
      .from(chats)
      .where(
        and(
          eq(chats.id, params.chatId as string),
          eq(chats.userId, decoded.userId)
        )
      );

    if (!chat) {
      return new Response(JSON.stringify({ message: 'Chat not found' }), {
        status: 404,
      });
    }

    const chatMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, params.chatId as string));

    return new Response(JSON.stringify(chatMessages), {
      status: 200,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
    });
  }
};

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const token = request.headers.get('Cookie')?.split('token=')[1];
    if (!token) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
      });
    }

    const decoded = await verifyToken(token);
    
    // Verify chat belongs to user
    const [chat] = await db
      .select()
      .from(chats)
      .where(
        and(
          eq(chats.id, params.chatId as string),
          eq(chats.userId, decoded.userId)
        )
      );

    if (!chat) {
      return new Response(JSON.stringify({ message: 'Chat not found' }), {
        status: 404,
      });
    }

    const { content, role } = await request.json();

    const [newMessage] = await db
      .insert(messages)
      .values({
        chatId: params.chatId as string,
        content,
        role,
      })
      .returning();

    return new Response(JSON.stringify(newMessage), {
      status: 201,
    });
  } catch (error) {
    console.error('Error creating message:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
    });
  }
};
