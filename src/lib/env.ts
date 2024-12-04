import { z } from 'zod';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Helper function to clean environment variable values
const cleanEnvValue = (value: string | undefined) => {
  if (!value) return undefined;
  // Remove surrounding quotes if present
  return value.replace(/^["'](.+)["']$/, '$1');
};

const envSchema = z.object({
  DATABASE_URL: z.string(),
  POSTGRES_HOST: z.string(),
  POSTGRES_USER: z.string(),
  POSTGRES_PASSWORD: z.string(),
  POSTGRES_DB: z.string(),
  AUTH_SECRET: z.string(),
  KV_REST_API_URL: z.string().optional(),
  KV_REST_API_TOKEN: z.string().optional(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
});

// Clean and parse environment variables
const rawEnv = {
  DATABASE_URL: cleanEnvValue(process.env.DATABASE_URL),
  POSTGRES_HOST: cleanEnvValue(process.env.POSTGRES_HOST),
  POSTGRES_USER: cleanEnvValue(process.env.POSTGRES_USER),
  POSTGRES_PASSWORD: cleanEnvValue(process.env.POSTGRES_PASSWORD),
  POSTGRES_DB: cleanEnvValue(process.env.POSTGRES_DB),
  AUTH_SECRET: cleanEnvValue(process.env.AUTH_SECRET),
  KV_REST_API_URL: cleanEnvValue(process.env.KV_REST_API_URL),
  KV_REST_API_TOKEN: cleanEnvValue(process.env.KV_REST_API_TOKEN),
  REDIS_URL: cleanEnvValue(process.env.REDIS_URL),
};

// Parse and validate environment variables
export const env = envSchema.parse(rawEnv);
