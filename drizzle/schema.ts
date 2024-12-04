import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  json,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').unique(),
  participantId: text('participant_id').unique(),
  name: text('name').notNull(),
  password: text('password'),
  role: text('role').notNull().default('user'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const patients = pgTable('patients', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  dateOfBirth: timestamp('date_of_birth'),
  medicalHistory: json('medical_history'),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const chats = pgTable('chats', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  patientId: uuid('patient_id').references(() => patients.id).notNull(),
  title: text('title').notNull(),
  isArchived: boolean('is_archived').default(false),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  chatId: uuid('chat_id').references(() => chats.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  role: text('role').notNull(), // 'user' or 'assistant'
  metadata: json('metadata'),
  deliveredAt: timestamp('delivered_at'),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const typingStatus = pgTable('typing_status', {
  chatId: uuid('chat_id').references(() => chats.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  pk: { name: 'typing_status_pk', columns: [table.chatId, table.userId] },
}));

export const chatAttachments = pgTable('chat_attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  chatId: uuid('chat_id').references(() => chats.id).notNull(),
  messageId: uuid('message_id').references(() => messages.id),
  userId: uuid('user_id').references(() => users.id).notNull(),
  type: text('type').notNull(), // 'image', 'document', etc.
  url: text('url').notNull(),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const chatParticipants = pgTable('chat_participants', {
  chatId: uuid('chat_id').references(() => chats.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  role: text('role').notNull().default('participant'), // 'owner', 'participant'
  lastReadMessageId: uuid('last_read_message_id').references(() => messages.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  pk: { name: 'chat_participants_pk', columns: [table.chatId, table.userId] },
}));

export const userSessions = pgTable('user_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  sessionId: text('session_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const ccdResults = pgTable('ccd_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  chatId: uuid('chat_id').references(() => chats.id).notNull(),
  result: json('result').notNull(),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const ccdTruths = pgTable('ccd_truths', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  chatId: uuid('chat_id').references(() => chats.id).notNull(),
  truth: json('truth').notNull(),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type CCDResult = typeof ccdResults.$inferSelect;
export type CCDTruth = typeof ccdTruths.$inferSelect;
