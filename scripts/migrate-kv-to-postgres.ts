import * as dotenv from 'dotenv';
dotenv.config();

import { db } from '../src/lib/db'
import { users, chats, messages, ccdResults, ccdTruths, patients } from '../drizzle/schema'
import { eq } from 'drizzle-orm'
import type { InferInsertModel } from 'drizzle-orm'
import crypto from 'crypto'

interface KVProfile {
  id?: string;
  userId: string;
  name: string;
  dateOfBirth?: string | null;
  medicalHistory?: Record<string, any>;
  metadata?: Record<string, any>;
}

type PatientInsert = InferInsertModel<typeof patients>

class VercelKVClient {
  private baseUrl: string;
  private token: string;

  constructor() {
    const baseUrl = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;

    if (!baseUrl || !token) {
      throw new Error('KV_REST_API_URL and KV_REST_API_TOKEN environment variables are required');
    }

    this.baseUrl = baseUrl;
    this.token = token;
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/keys/${encodeURIComponent(pattern)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('KV API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Failed to get keys: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Keys response:', data);
      
      if (!data.result || !Array.isArray(data.result)) {
        console.warn('Unexpected response format:', data);
        return [];
      }

      return data.result;
    } catch (error) {
      console.error('Error in keys method:', error);
      throw error;
    }
  }

  async get(key: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/get/${encodeURIComponent(key)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('KV API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Failed to get value: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      if (!data.result) {
        console.warn('No result found for key:', key);
        return null;
      }

      try {
        return typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
      } catch {
        return data.result;
      }
    } catch (error) {
      console.error('Error in get method:', error);
      throw error;
    }
  }
}

async function migrateData() {
  console.log('Starting migration from Vercel KV to PostgreSQL...');
  const kv = new VercelKVClient();

  try {
    // Get all profile keys
    console.log('\nFetching profile keys...');
    const profileKeys = await kv.keys('profile_*');
    console.log(`Found ${profileKeys.length} profile keys:`, profileKeys);

    // Create a default user for profiles if not exists
    const defaultUserId = crypto.randomUUID();
    await db.insert(users).values({
      id: defaultUserId,
      email: 'default@example.com',
      name: 'Default User',
      role: 'user',
    }).onConflictDoNothing();

    // Migrate profiles to patients
    for (const key of profileKeys) {
      const profileData = await kv.get(key);
      console.log(`\nMigrating profile: ${key}`, profileData);
      
      if (!profileData) {
        console.warn(`No data found for profile: ${key}`);
        continue;
      }

      try {
        // Create patient record
        const patientId = crypto.randomUUID();
        await db.insert(patients).values({
          id: patientId,
          userId: defaultUserId,
          name: profileData.name || 'Unknown Patient',
          dateOfBirth: profileData.dateOfBirth ? new Date(profileData.dateOfBirth) : null,
          medicalHistory: profileData.medicalHistory || {},
          metadata: {
            originalKvKey: key,
            originalProfile: profileData,
          },
        }).onConflictDoNothing();

        // Create an initial chat for this patient
        const chatId = crypto.randomUUID();
        await db.insert(chats).values({
          id: chatId,
          userId: defaultUserId,
          patientId: patientId,
          title: `Initial Consultation - ${profileData.name || 'Unknown Patient'}`,
          isArchived: false,
          metadata: {
            originalKvKey: key,
            migratedAt: new Date().toISOString(),
          },
        }).onConflictDoNothing();

        // If there are any notes or history, create them as messages
        if (profileData.medicalHistory) {
          await db.insert(messages).values({
            id: crypto.randomUUID(),
            chatId: chatId,
            userId: defaultUserId,
            content: JSON.stringify(profileData.medicalHistory, null, 2),
            role: 'system',
            metadata: {
              type: 'medical_history',
              migratedAt: new Date().toISOString(),
            },
          }).onConflictDoNothing();
        }

        console.log(`Successfully migrated profile ${key} to patient ${patientId}`);
      } catch (error) {
        console.error(`Error migrating profile ${key}:`, error);
      }
    }

    // Check for current profile assignments
    console.log('\nFetching current profile assignments...');
    const currentProfileKeys = await kv.keys('curr_profile_*');
    console.log(`Found ${currentProfileKeys.length} current profile assignments`);

    for (const key of currentProfileKeys) {
      const currentProfile = await kv.get(key);
      if (!currentProfile) continue;

      try {
        // Update patient metadata to mark as current
        if (currentProfile.id) {
          await db.update(patients)
            .set({
              metadata: (existing: any) => ({
                ...existing,
                isCurrent: true,
                updatedAt: new Date().toISOString(),
              }),
            })
            .where(eq(patients.id, currentProfile.id));
        }
      } catch (error) {
        console.error(`Error updating current profile ${key}:`, error);
      }
    }

    // Get all chat keys
    console.log('\nFetching chat keys...');
    const chatKeys = await kv.keys('chat:*');
    console.log(`Found ${chatKeys.length} chat keys`);

    for (const key of chatKeys) {
      const chatData = await kv.get(key);
      console.log(`Migrating chat: ${key}`);
      
      if (!chatData) {
        console.warn(`No data found for chat: ${key}`);
        continue;
      }

      try {
        // First ensure the user exists
        if (chatData.userId) {
          await db.insert(users).values({
            id: chatData.userId,
            email: chatData.userEmail || '',
            name: chatData.userName || '',
            role: 'user', // Add the required role field
          }).onConflictDoNothing();
        }

        // Store the chat
        const chatId = key.replace('chat:', '');
        await db.insert(chats).values({
          id: chatId,
          userId: chatData.userId,
          patientId: chatData.patientId || crypto.randomUUID(), // You might need to handle this differently
          title: chatData.title || 'Untitled Chat',
          isArchived: chatData.isArchived || false,
          metadata: chatData.metadata || {},
        }).onConflictDoNothing();

        // Store messages if they exist
        if (chatData.messages && Array.isArray(chatData.messages)) {
          for (const msg of chatData.messages) {
            await db.insert(messages).values({
              id: msg.id || crypto.randomUUID(),
              chatId,
              userId: chatData.userId,
              content: msg.content,
              role: msg.role || 'user',
              metadata: msg.metadata || {},
              deliveredAt: msg.deliveredAt ? new Date(msg.deliveredAt) : null,
              readAt: msg.readAt ? new Date(msg.readAt) : null,
            }).onConflictDoNothing();
          }
        }
      } catch (error) {
        console.error(`Error migrating chat ${key}:`, error);
      }
    }

    // Get all CCD results
    console.log('\nFetching CCD results...');
    const ccdResultKeys = await kv.keys('ccd:result:*');
    console.log(`Found ${ccdResultKeys.length} CCD result keys`);

    for (const key of ccdResultKeys) {
      const resultData = await kv.get(key);
      if (!resultData) continue;

      try {
        const [_, __, userId, chatId] = key.split(':');
        await db.insert(ccdResults).values({
          userId,
          chatId,
          result: resultData,
          metadata: {},
        }).onConflictDoNothing();
      } catch (error) {
        console.error(`Error migrating CCD result ${key}:`, error);
      }
    }

    // Get all CCD truth data
    console.log('\nFetching CCD truth data...');
    const ccdTruthKeys = await kv.keys('ccd:truth:*');
    console.log(`Found ${ccdTruthKeys.length} CCD truth keys`);

    for (const key of ccdTruthKeys) {
      const truthData = await kv.get(key);
      if (!truthData) continue;

      try {
        const [_, __, userId, chatId] = key.split(':');
        await db.insert(ccdTruths).values({
          userId,
          chatId,
          truth: truthData,
          metadata: {},
        }).onConflictDoNothing();
      } catch (error) {
        console.error(`Error migrating CCD truth ${key}:`, error);
      }
    }

    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
}

async function testKVConnection() {
  console.log('Testing KV connection...');
  const kv = new VercelKVClient();

  try {
    // Test with a simple key pattern
    console.log('Testing key retrieval...');
    const allKeys = await kv.keys('*');
    console.log('All keys:', allKeys);

    // Test with specific patterns
    const patterns = ['chat:*', 'user:*', 'ccd:*', 'user:chat:*'];
    for (const pattern of patterns) {
      console.log(`\nTesting pattern: ${pattern}`);
      const keys = await kv.keys(pattern);
      console.log(`Found ${keys.length} keys:`, keys);
    }

    // Test raw fetch to verify API connection
    const response = await fetch(`${process.env.KV_REST_API_URL}/list/0/0`, {
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`
      }
    });
    
    console.log('\nRaw API response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.text()
    });

  } catch (error) {
    console.error('Error testing KV connection:', error);
  }
}

// Run migration if this file is being executed directly
if (import.meta.url === new URL(import.meta.url).href) {
  testKVConnection()
    .then(() => migrateData())
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
