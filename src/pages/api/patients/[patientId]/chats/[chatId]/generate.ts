import type { APIRoute } from 'astro';
import { authMiddleware } from '../../../../../../middleware/auth';
import { generateAIResponse } from '../../../../../../lib/ai';
import { error } from '../../../../../../lib/api';
import { aiRateLimiter, getRateLimitResponse } from '../../../../../../lib/rateLimit';

export const POST: APIRoute = async ({ params, request }) => {
  try {
    // Verify authentication
    const userId = await authMiddleware({ request } as any);
    if (typeof userId !== 'string') {
      return userId; // Returns unauthorized response
    }

    // Check rate limit
    const rateLimitResult = aiRateLimiter.check(userId);
    if (!rateLimitResult.allowed) {
      return getRateLimitResponse(rateLimitResult.resetTime);
    }

    const { patientId, chatId } = params;
    if (!patientId || !chatId) {
      return error('Patient ID and Chat ID are required', 400);
    }

    // Check if client accepts server-sent events
    const acceptHeader = request.headers.get('Accept');
    const wantsStreaming = acceptHeader?.includes('text/event-stream');

    if (wantsStreaming) {
      // Set up streaming response
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();

          try {
            await generateAIResponse(chatId, patientId, {
              onToken: (token) => {
                const data = `data: ${JSON.stringify({ type: 'token', content: token })}\n\n`;
                controller.enqueue(encoder.encode(data));
              },
              onComplete: (message) => {
                const data = `data: ${JSON.stringify({ type: 'complete', content: message })}\n\n`;
                controller.enqueue(encoder.encode(data));
                controller.close();
              },
              onError: (error) => {
                const data = `data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`;
                controller.enqueue(encoder.encode(data));
                controller.close();
              },
            });
          } catch (err) {
            const data = `data: ${JSON.stringify({
              type: 'error',
              content: err instanceof Error ? err.message : 'Unknown error',
            })}\n\n`;
            controller.enqueue(encoder.encode(data));
            controller.close();
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
      const message = await generateAIResponse(chatId, patientId);
      return new Response(JSON.stringify(message), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  } catch (err) {
    console.error('Error in generate endpoint:', err);
    return error(
      err instanceof Error ? err.message : 'Failed to generate AI response'
    );
  }
};
