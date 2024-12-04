import type { APIRoute } from 'astro';
import { redis } from '../../../lib/redis';
import { getSession } from '../../../lib/auth';
import { nanoid } from '../../../lib/utils';

export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request);

  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
    });
  }

  const { id } = await request.json();

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing chat ID' }), {
      status: 400,
    });
  }

  try {
    const chat = await redis.hgetall(`chat:${id}`);

    if (!chat || chat.userId !== session.user.id) {
      return new Response(JSON.stringify({ error: 'Chat not found' }), {
        status: 404,
      });
    }

    const sharePath = nanoid();
    await redis.hset(`chat:${id}`, {
      sharePath,
    });

    const shareUrl = `${new URL(request.url).origin}/share/${id}`;

    return new Response(JSON.stringify({ shareUrl }), {
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
    });
  }
}
