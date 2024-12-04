import type { APIRoute } from 'astro';
import { getUserFromRequest } from '../../../lib/auth';
import { getUserProfile, updateUserProfile } from '../../../lib/user-profile';

export const GET: APIRoute = async ({ request }) => {
  try {
    const userId = await getUserFromRequest(request);
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }

    const profile = await getUserProfile(userId);
    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404 }
      );
    }

    return new Response(
      JSON.stringify(profile),
      { status: 200 }
    );
  } catch (error) {
    console.error('Get profile error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  try {
    const userId = await getUserFromRequest(request);
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }

    const updates = await request.json();
    const updatedProfile = await updateUserProfile(userId, updates);
    
    if (!updatedProfile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404 }
      );
    }

    return new Response(
      JSON.stringify(updatedProfile),
      { status: 200 }
    );
  } catch (error) {
    console.error('Update profile error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
};
