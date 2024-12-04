import type { APIRoute } from 'astro';
import { getUserFromRequest } from '../../../../../../../lib/auth';
import { db, getById, create } from '../../../../../../../lib/db';
import { messages, chats } from '../../../../../../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { generateAIResponse } from '../../../../../../../lib/ai';
import { rateLimit } from '../../../../../../../lib/rateLimit';

export const GET: APIRoute = async ({ params, request }) => {
  try {
    const userId = await getUserFromRequest(request);
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { chatId } = params;
    if (!chatId) {
      return new Response('Chat ID is required', { status: 400 });
    }

    // Verify chat belongs to user
    const chat = await getById(chats, chatId);
    if (!chat || chat.userId !== userId) {
      return new Response('Chat not found', { status: 404 });
    }

    // Get messages for chat
    const chatMessages = await db.select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(messages.createdAt);

    return new Response(JSON.stringify(chatMessages), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const userId = await getUserFromRequest(request);
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { chatId } = params;
    if (!chatId) {
      return new Response('Chat ID is required', { status: 400 });
    }

    // Verify chat belongs to user
    const chat = await getById(chats, chatId);
    if (!chat || chat.userId !== userId) {
      return new Response('Chat not found', { status: 404 });
    }

    // Check rate limit
    const limiter = await rateLimit(request);
    if (!limiter.success) {
      return new Response('Too Many Requests', {
        status: 429,
        headers: { 'Retry-After': limiter.retryAfter.toString() },
      });
    }

    // Get message content from request
    const body = await request.json();
    const { content } = body;
    if (!content) {
      return new Response('Message content is required', { status: 400 });
    }

    // Create user message
    const userMessage = await create(messages, {
      chatId,
      content,
      role: 'user',
      userId,
    });

    // Check if client accepts server-sent events
    const acceptHeader = request.headers.get('Accept');
    const useSSE = acceptHeader?.includes('text/event-stream');

    if (useSSE) {
      // Set up SSE response
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Send user message
            controller.enqueue(`data: ${JSON.stringify(userMessage)}\n\n`);

            // Generate AI response with streaming
            const aiMessage = await generateAIResponse(content, {
              onToken: (token) => {
                controller.enqueue(`data: ${JSON.stringify({ token })}\n\n`);
              },
            });

            // Save AI message to database
            const savedAiMessage = await create(messages, {
              chatId,
              content: aiMessage,
              role: 'assistant',
              userId,
            });

            // Send complete AI message
            controller.enqueue(`data: ${JSON.stringify(savedAiMessage)}\n\n`);
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Non-streaming response
      // Generate AI response
      const aiContent = await generateAIResponse(content);

      // Create AI message
      const aiMessage = await create(messages, {
        chatId,
        content: aiContent,
        role: 'assistant',
        userId,
      });

      return new Response(JSON.stringify(aiMessage), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error creating message:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ params, request }) => {
  try {
    const userId = await getUserFromRequest(request);
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { chatId } = params;
    if (!chatId) {
      return new Response('Chat ID is required', { status: 400 });
    }

    // Verify chat belongs to user
    const chat = await getById(chats, chatId);
    if (!chat || chat.userId !== userId) {
      return new Response('Chat not found', { status: 404 });
    }

    // Delete all messages in chat
    await db.delete(messages).where(eq(messages.chatId, chatId));

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting messages:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
