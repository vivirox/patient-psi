import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from './env';
import * as schema from '../../drizzle/schema';
import { eq, and, desc, lt, gt, count, sql, isNull } from 'drizzle-orm';
import type { PgTable, PgColumn } from 'drizzle-orm/pg-core';

// Define metadata types
interface PatientMetadata {
  patientType?: string;
  archived?: boolean;
  originalKvKey?: string;
  [key: string]: unknown;
}

// Initialize postgres client
const client = postgres(env.DATABASE_URL);
export const db = drizzle(client, { schema });

interface TableWithId {
  id: PgColumn<any>;
}

interface TableWithUserId {
  userId: PgColumn<any>;
}

// Generic database operations
export async function getById<T extends Record<string, any>>(
  table: PgTable<any> & TableWithId,
  id: string
): Promise<T | null> {
  const [result] = await db.select().from(table).where(eq(table.id, id)).limit(1);
  return (result as T) || null;
}

export async function getByUserId<T extends Record<string, any>>(
  table: PgTable<any> & TableWithUserId,
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
  } = {}
): Promise<T[]> {
  const { limit = 50, offset = 0, orderBy = 'createdAt', orderDirection = 'desc' } = options;

  const query = db
    .select()
    .from(table)
    .where(eq(table.userId, userId))
    .limit(limit)
    .offset(offset);

  if (orderBy) {
    query.orderBy(orderDirection === 'desc' ? desc((table as any)[orderBy]) : (table as any)[orderBy]);
  }

  const result = await query;
  return result as T[];
}

export async function create<T>(table: any, data: Partial<T>): Promise<T> {
  const [result] = await db.insert(table).values(data).returning();
  return result;
}

export async function update<T>(
  table: any,
  id: string,
  data: Partial<T>
): Promise<T | null> {
  const [result] = await db
    .update(table)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(table.id, id))
    .returning();
  return result || null;
}

export async function remove(table: any, id: string): Promise<boolean> {
  const [result] = await db.delete(table).where(eq(table.id, id)).returning();
  return !!result;
}

// Chat-specific operations
export async function getChatMessages(
  chatId: string,
  options: {
    limit?: number;
    before?: Date;
    after?: Date;
  } = {}
): Promise<typeof schema.messages.$inferSelect[]> {
  const { limit = 50, before, after } = options;

  const conditions = [eq(schema.messages.chatId, chatId)];
  
  if (before) {
    conditions.push(lt(schema.messages.createdAt, before));
  }

  if (after) {
    conditions.push(gt(schema.messages.createdAt, after));
  }

  const query = db
    .select()
    .from(schema.messages)
    .where(and(...conditions))
    .limit(limit)
    .orderBy(desc(schema.messages.createdAt));

  return await query;
}

type ChatSelect = typeof schema.chats.$inferSelect;

interface ChatWithCounts extends ChatSelect {
  messageCount: number;
  lastMessage: string | null;
}

export async function getPatientChats(
  patientId: string,
  options: {
    limit?: number;
    offset?: number;
  } = {}
): Promise<ChatWithCounts[]> {
  const { limit = 50, offset = 0 } = options;

  const baseChats = await db
    .select({
      id: schema.chats.id,
      userId: schema.chats.userId,
      patientId: schema.chats.patientId,
      title: schema.chats.title,
      isArchived: schema.chats.isArchived,
      metadata: schema.chats.metadata,
      createdAt: schema.chats.createdAt,
      updatedAt: schema.chats.updatedAt,
    })
    .from(schema.chats)
    .where(eq(schema.chats.patientId, patientId))
    .limit(limit)
    .offset(offset);

  const chats: ChatWithCounts[] = baseChats.map(chat => ({
    ...chat,
    messageCount: 0,
    lastMessage: null
  }));

  for (const chat of chats) {
    const messageCountResult = await db
      .select({ count: count() })
      .from(schema.messages)
      .where(eq(schema.messages.chatId, chat.id));
    chat.messageCount = Number(messageCountResult[0]?.count) || 0;

    const lastMessageResult = await db
      .select({ content: schema.messages.content })
      .from(schema.messages)
      .where(eq(schema.messages.chatId, chat.id))
      .orderBy(desc(schema.messages.createdAt))
      .limit(1);
    chat.lastMessage = lastMessageResult[0]?.content || null;
  }

  return chats;
}

// Patient-specific operations
export async function getCurrentPatient(userId: string) {
  const [result] = await db
    .select()
    .from(schema.patients)
    .where(eq(schema.patients.userId, userId))
    .orderBy(desc(schema.patients.updatedAt))
    .limit(1);
  return result || null;
}

export async function setCurrentPatient(
  userId: string,
  patientData: Partial<Omit<typeof schema.patients.$inferInsert, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
) {
  const existingPatient = await getCurrentPatient(userId);
  
  if (existingPatient) {
    return await db
      .update(schema.patients)
      .set({
        ...patientData,
        updatedAt: new Date(),
      })
      .where(eq(schema.patients.id, existingPatient.id))
      .returning()
      .then(rows => rows[0]);
  }
  
  // Ensure required fields are present
  if (!patientData.name) {
    throw new Error('Patient name is required');
  }

  return await db
    .insert(schema.patients)
    .values({
      name: patientData.name,
      userId,
      id: crypto.randomUUID(),
      dateOfBirth: patientData.dateOfBirth,
      medicalHistory: patientData.medicalHistory,
      metadata: patientData.metadata,
    })
    .returning()
    .then(rows => rows[0]);
}

export async function getRandomPatient() {
  const [result] = await db
    .select()
    .from(schema.patients)
    .orderBy(sql`RANDOM()`)
    .limit(1);
  return result || null;
}

// Additional patient-specific operations
export async function getPatientsByUserId(userId: string) {
  return await db
    .select()
    .from(schema.patients)
    .where(eq(schema.patients.userId, userId))
    .orderBy(desc(schema.patients.updatedAt));
}

export async function setPatientType(patientId: string, patientType: string) {
  return await db
    .update(schema.patients)
    .set({
      metadata: (existing: PatientMetadata | null) => ({
        ...(existing || {}),
        patientType,
      }),
      updatedAt: new Date(),
    })
    .where(eq(schema.patients.id, patientId))
    .returning()
    .then(rows => rows[0]);
}

export async function getPatientType(patientId: string): Promise<string | null> {
  const patient = await db
    .select({ metadata: schema.patients.metadata })
    .from(schema.patients)
    .where(eq(schema.patients.id, patientId))
    .limit(1)
    .then(rows => rows[0]);
    
  return (patient?.metadata as PatientMetadata | null)?.patientType || null;
}

export async function archivePatient(patientId: string) {
  return await db
    .update(schema.patients)
    .set({
      metadata: (existing: PatientMetadata | null) => ({
        ...(existing || {}),
        archived: true,
      }),
      updatedAt: new Date(),
    })
    .where(eq(schema.patients.id, patientId))
    .returning()
    .then(rows => rows[0]);
}

export async function updatePatientHistory(patientId: string, historyUpdate: any) {
  return await db
    .update(schema.patients)
    .set({
      medicalHistory: historyUpdate,
      updatedAt: new Date(),
    })
    .where(eq(schema.patients.id, patientId))
    .returning()
    .then(rows => rows[0]);
}

// Session management
export async function setUserSessions(userId: string, sessions: string[]) {
  // First, remove all existing sessions for this user
  await db.delete(schema.userSessions)
    .where(eq(schema.userSessions.userId, userId));

  // Then insert the new sessions
  if (sessions.length > 0) {
    await db.insert(schema.userSessions)
      .values(
        sessions.map(sessionId => ({
          userId,
          sessionId,
          id: crypto.randomUUID(),
        }))
      );
  }
}

export async function getUserSessions(userId: string): Promise<string[]> {
  const sessions = await db
    .select({ sessionId: schema.userSessions.sessionId })
    .from(schema.userSessions)
    .where(eq(schema.userSessions.userId, userId))
    .orderBy(desc(schema.userSessions.createdAt));

  return sessions.map(s => s.sessionId);
}

export async function addUserSession(userId: string, sessionId: string) {
  await db.insert(schema.userSessions)
    .values({
      id: crypto.randomUUID(),
      userId,
      sessionId,
    });
}

export async function removeUserSession(userId: string, sessionId: string) {
  await db.delete(schema.userSessions)
    .where(
      and(
        eq(schema.userSessions.userId, userId),
        eq(schema.userSessions.sessionId, sessionId)
      )
    );
}

// Real-time support functions
interface TypingUser {
  userId: string;
  lastTyped: Date;
}

interface TypingStatus {
  users: TypingUser[];
  chatId: string;
}

// In-memory cache for typing status
const typingCache = new Map<string, TypingStatus>();
const TYPING_TIMEOUT = 10000; // 10 seconds

export async function getTypingUsers(chatId: string): Promise<string[]> {
  try {
    // Check cache first
    const cached = typingCache.get(chatId);
    if (cached) {
      const now = Date.now();
      const activeUsers = cached.users.filter(
        user => (now - user.lastTyped.getTime()) < TYPING_TIMEOUT
      );
      return activeUsers.map(user => user.userId);
    }

    // If not in cache, get from database
    const result = await db
      .select()
      .from(schema.typingStatus)
      .where(
        and(
          eq(schema.typingStatus.chatId, chatId),
          gt(schema.typingStatus.updatedAt, sql`NOW() - INTERVAL '${TYPING_TIMEOUT} milliseconds'`)
        )
      );

    // Update cache
    typingCache.set(chatId, {
      chatId,
      users: result.map(r => ({
        userId: r.userId,
        lastTyped: new Date()
      }))
    });

    return result.map(r => r.userId);
  } catch (error) {
    console.error('Error getting typing users:', error);
    return [];
  }
}

export async function updateTypingStatus(chatId: string, userId: string): Promise<void> {
  try {
    // Update cache first for immediate feedback
    const cached = typingCache.get(chatId);
    if (cached) {
      const userIndex = cached.users.findIndex(u => u.userId === userId);
      if (userIndex >= 0) {
        cached.users[userIndex].lastTyped = new Date();
      } else {
        cached.users.push({ userId, lastTyped: new Date() });
      }
    } else {
      typingCache.set(chatId, {
        chatId,
        users: [{ userId, lastTyped: new Date() }]
      });
    }

    // Then update database
    await db
      .insert(schema.typingStatus)
      .values({
        chatId,
        userId,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: [schema.typingStatus.chatId, schema.typingStatus.userId],
        set: { updatedAt: new Date() }
      });
  } catch (error) {
    console.error('Error updating typing status:', error);
    // Remove from cache if database update failed
    const cached = typingCache.get(chatId);
    if (cached) {
      cached.users = cached.users.filter(u => u.userId !== userId);
      if (cached.users.length === 0) {
        typingCache.delete(chatId);
      }
    }
  }
}

export async function clearTypingStatus(chatId: string, userId: string): Promise<void> {
  try {
    // Remove from cache first
    const cached = typingCache.get(chatId);
    if (cached) {
      cached.users = cached.users.filter(u => u.userId !== userId);
      if (cached.users.length === 0) {
        typingCache.delete(chatId);
      }
    }

    // Then remove from database
    await db
      .delete(schema.typingStatus)
      .where(
        and(
          eq(schema.typingStatus.chatId, chatId),
          eq(schema.typingStatus.userId, userId)
        )
      );
  } catch (error) {
    console.error('Error clearing typing status:', error);
  }
}

export async function markMessageAsDelivered(messageId: string): Promise<void> {
  await db
    .update(schema.messages)
    .set({ deliveredAt: new Date() })
    .where(eq(schema.messages.id, messageId));
}

export async function markMessageAsRead(messageId: string): Promise<void> {
  await db
    .update(schema.messages)
    .set({ readAt: new Date() })
    .where(eq(schema.messages.id, messageId));
}

export async function getUnreadMessageCount(chatId: string): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(schema.messages)
    .where(
      and(
        eq(schema.messages.chatId, chatId),
        isNull(schema.messages.readAt)
      )
    );

  return Number(result?.count) || 0;
}
