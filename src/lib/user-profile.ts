import { redis } from './redis';
import { z } from 'zod';

// Define settings type
export type UserSettings = {
  theme: 'light' | 'dark';
  notifications: boolean;
  language: string;
};

export type UserSettingsKey = keyof UserSettings;

export const userProfileSchema = z.object({
  id: z.string(),
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['admin', 'therapist', 'participant']),
  settings: z.object({
    theme: z.enum(['light', 'dark']).default('light'),
    notifications: z.boolean().default(true),
    language: z.string().default('en'),
  }).default({}),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const email = await redis.get(`userId:${userId}`);
  if (!email) return null;
  
  const profile = await redis.hgetall(`user:${email}`);
  if (!profile) return null;
  
  try {
    return userProfileSchema.parse({
      ...profile,
      settings: JSON.parse(profile.settings || '{}'),
      metadata: JSON.parse(profile.metadata || '{}'),
    });
  } catch (error) {
    console.error('Error parsing user profile:', error);
    return null;
  }
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Omit<UserProfile, 'id' | 'email' | 'createdAt'>>
): Promise<UserProfile | null> {
  const email = await redis.get(`userId:${userId}`);
  if (!email) return null;
  
  const currentProfile = await getUserProfile(userId);
  if (!currentProfile) return null;
  
  const updatedProfile = {
    ...currentProfile,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  // Validate the updated profile
  const validatedProfile = userProfileSchema.parse(updatedProfile);
  
  // Store the updated profile
  await redis.hset(`user:${email}`, {
    ...validatedProfile,
    settings: JSON.stringify(validatedProfile.settings),
    metadata: JSON.stringify(validatedProfile.metadata),
  });
  
  return validatedProfile;
}

export async function getUserPreference<T>(
  userId: string,
  key: UserSettingsKey,
  defaultValue: T
): Promise<T> {
  const profile = await getUserProfile(userId);
  if (!profile) return defaultValue;
  
  return profile.settings[key] as T ?? defaultValue;
}

export async function setUserPreference<T>(
  userId: string,
  key: UserSettingsKey,
  value: T
): Promise<boolean> {
  const profile = await getUserProfile(userId);
  if (!profile) return false;
  
  const updatedProfile = await updateUserProfile(userId, {
    settings: {
      ...profile.settings,
      [key]: value,
    },
  });
  
  return !!updatedProfile;
}

export async function getUserMetadata<T>(
  userId: string,
  key: string,
  defaultValue: T
): Promise<T> {
  const profile = await getUserProfile(userId);
  if (!profile) return defaultValue;
  
  return profile.metadata[key] as T ?? defaultValue;
}

export async function setUserMetadata<T>(
  userId: string,
  key: string,
  value: T
): Promise<boolean> {
  const profile = await getUserProfile(userId);
  if (!profile) return false;
  
  const updatedProfile = await updateUserProfile(userId, {
    metadata: {
      ...profile.metadata,
      [key]: value,
    },
  });
  
  return !!updatedProfile;
}
