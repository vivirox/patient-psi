import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { patients } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { verifyToken } from '../../../lib/auth';

export const GET: APIRoute = async ({ request }) => {
  try {
    const token = request.headers.get('Cookie')?.split('token=')[1];
    if (!token) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { 
        status: 401 
      });
    }

    const decoded = await verifyToken(token);
    const userPatients = await db
      .select()
      .from(patients)
      .where(eq(patients.userId, decoded.userId));

    return new Response(JSON.stringify(userPatients), { 
      status: 200 
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    return new Response(
      JSON.stringify({ message: 'Internal server error' }), 
      { status: 500 }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const token = request.headers.get('Cookie')?.split('token=')[1];
    if (!token) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { 
        status: 401 
      });
    }

    const decoded = await verifyToken(token);
    const { name, type, description } = await request.json();

    const [newPatient] = await db
      .insert(patients)
      .values({
        userId: decoded.userId,
        name,
        type,
        description,
      })
      .returning();

    return new Response(JSON.stringify(newPatient), { 
      status: 201 
    });
  } catch (error) {
    console.error('Error creating patient:', error);
    return new Response(
      JSON.stringify({ message: 'Internal server error' }), 
      { status: 500 }
    );
  }
};
