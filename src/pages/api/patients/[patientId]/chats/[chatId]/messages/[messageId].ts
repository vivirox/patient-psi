import type { APIRoute } from 'astro';
import { getUserFromRequest } from '../../../../../../../lib/auth';
import { db, getById } from '../../../../../../../lib/db';
import { messages } from '../../../../../../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { generateAIResponse } from '../../../../../../../lib/ai';

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const userId = await getUserFromRequest(request);
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { messageId } = params;
    if (!messageId) {
      return new Response('Message ID is required', { status: 400 });
    }

    // Get message and verify ownership
    const message = await getById(messages, messageId);
    if (!message || message.userId !== userId) {
      return new Response('Message not found', { status: 404 });
    }

    // Only allow editing user messages
    if (message.role !== 'user') {
      return new Response('Can only edit user messages', { status: 400 });
    }

    // Get updated content from request
    const body = await request.json();
    const { content } = body;
    if (!content) {
      return new Response('Message content is required', { status: 400 });
    }

    // Update message
    const [updatedMessage] = await db
      .update(messages)
      .set({ content, updatedAt: new Date() })
      .where(eq(messages.id, messageId))
      .returning();

    // Get next assistant message if it exists
    const nextMessage = await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, message.chatId))
      .orderBy(messages.createdAt)
      .limit(1);

    // If there's a next message and it's from the assistant, regenerate it
    if (nextMessage[0]?.role === 'assistant') {
      const aiContent = await generateAIResponse(content);
      const [updatedAiMessage] = await db
        .update(messages)
        .set({ content: aiContent, updatedAt: new Date() })
        .where(eq(messages.id, nextMessage[0].id))
        .returning();

      return new Response(
        JSON.stringify({ message: updatedMessage, aiMessage: updatedAiMessage }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify({ message: updatedMessage }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating message:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ params, request }) => {
  try {
    const userId = await getUserFromRequest(request);
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { messageId } = params;
    if (!messageId) {
      return new Response('Message ID is required', { status: 400 });
    }

    // Get message and verify ownership
    const message = await getById(messages, messageId);
    if (!message || message.userId !== userId) {
      return new Response('Message not found', { status: 404 });
    }

    // Delete message
    await db.delete(messages).where(eq(messages.id, messageId));

    // If it was a user message, delete the next assistant message if it exists
    if (message.role === 'user') {
      const nextMessage = await db
        .select()
        .from(messages)
        .where(eq(messages.chatId, message.chatId))
        .orderBy(messages.createdAt)
        .limit(1);

      if (nextMessage[0]?.role === 'assistant') {
        await db.delete(messages).where(eq(messages.id, nextMessage[0].id));
      }
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting message:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
