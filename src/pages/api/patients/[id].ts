import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { patients } from '../../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { verifyToken } from '../../../lib/auth';

export const GET: APIRoute = async ({ params, request }) => {
  try {
    const token = request.headers.get('Cookie')?.split('token=')[1];
    if (!token) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
      });
    }

    const decoded = await verifyToken(token);
    const [patient] = await db
      .select()
      .from(patients)
      .where(
        and(
          eq(patients.id, params.id as string),
          eq(patients.userId, decoded.userId)
        )
      );

    if (!patient) {
      return new Response(JSON.stringify({ message: 'Patient not found' }), {
        status: 404,
      });
    }

    return new Response(JSON.stringify(patient), {
      status: 200,
    });
  } catch (error) {
    console.error('Error fetching patient:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
    });
  }
};

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const token = request.headers.get('Cookie')?.split('token=')[1];
    if (!token) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
      });
    }

    const decoded = await verifyToken(token);
    const { name, type, description } = await request.json();

    const [updatedPatient] = await db
      .update(patients)
      .set({
        name,
        type,
        description,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(patients.id, params.id as string),
          eq(patients.userId, decoded.userId)
        )
      )
      .returning();

    if (!updatedPatient) {
      return new Response(JSON.stringify({ message: 'Patient not found' }), {
        status: 404,
      });
    }

    return new Response(JSON.stringify(updatedPatient), {
      status: 200,
    });
  } catch (error) {
    console.error('Error updating patient:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
    });
  }
};

export const DELETE: APIRoute = async ({ params, request }) => {
  try {
    const token = request.headers.get('Cookie')?.split('token=')[1];
    if (!token) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
      });
    }

    const decoded = await verifyToken(token);
    const [deletedPatient] = await db
      .delete(patients)
      .where(
        and(
          eq(patients.id, params.id as string),
          eq(patients.userId, decoded.userId)
        )
      )
      .returning();

    if (!deletedPatient) {
      return new Response(JSON.stringify({ message: 'Patient not found' }), {
        status: 404,
      });
    }

    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    console.error('Error deleting patient:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
    });
  }
};
