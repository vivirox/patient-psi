import type { APIRoute } from 'astro';
import { db } from '../../../../../lib/db';
import { chats } from '../../../../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { verifyToken } from '../../../../../lib/auth';

export const GET: APIRoute = async ({ params, request }) => {
  try {
    const token = request.headers.get('Cookie')?.split('token=')[1];
    if (!token) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
      });
    }

    const decoded = await verifyToken(token);
    const patientChats = await db
      .select()
      .from(chats)
      .where(
        and(
          eq(chats.patientId, params.patientId as string),
          eq(chats.userId, decoded.userId)
        )
      );

    return new Response(JSON.stringify(patientChats), {
      status: 200,
    });
  } catch (error) {
    console.error('Error fetching chats:', error);
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
    const { title } = await request.json();

    const [newChat] = await db
      .insert(chats)
      .values({
        patientId: params.patientId as string,
        userId: decoded.userId,
        title,
        shared: false,
      })
      .returning();

    return new Response(JSON.stringify(newChat), {
      status: 201,
    });
  } catch (error) {
    console.error('Error creating chat:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
    });
  }
};
