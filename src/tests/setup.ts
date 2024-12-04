import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';
import { closeRedisConnection } from '../lib/redis';

// Suppress React 18 warnings
const originalError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('ReactDOM.render is no longer supported') ||
     args[0].includes('React.createRoot'))
  ) {
    return;
  }
  originalError.call(console, ...args);
};

// Define Redis mock method types
type RedisMockMethod = 'get' | 'hgetall' | 'set' | 'hset' | 'hdel' | 'del' | 'exists' | 'expire' | 'quit' | 'flushall' | 'flushdb' | 'hmset' | 'sadd' | 'srem' | 'smembers';

// Mock the redis module
vi.mock('../lib/redis', () => {
  // Create mock Redis client inside the factory
  const createMockRedisClient = () => {
    const storage = new Map();
    
    const client = {
      get: vi.fn().mockImplementation(key => Promise.resolve(storage.get(key))),
      set: vi.fn().mockImplementation((key, value) => {
        storage.set(key, value);
        return Promise.resolve('OK');
      }),
      del: vi.fn().mockImplementation(key => {
        storage.delete(key);
        return Promise.resolve(1);
      }),
      hget: vi.fn().mockImplementation((key, field) => {
        const hash = storage.get(key);
        return Promise.resolve(hash ? hash[field] : null);
      }),
      hset: vi.fn().mockImplementation((key, field, value) => {
        const hash = storage.get(key) || {};
        hash[field] = value;
        storage.set(key, hash);
        return Promise.resolve('OK');
      }),
      hdel: vi.fn().mockImplementation((key, field) => {
        const hash = storage.get(key);
        if (hash) {
          delete hash[field];
          return Promise.resolve(1);
        }
        return Promise.resolve(0);
      }),
      hmset: vi.fn().mockImplementation((key, fields) => {
        const hash = storage.get(key) || {};
        Object.assign(hash, fields);
        storage.set(key, hash);
        return Promise.resolve('OK');
      }),
      hgetall: vi.fn().mockImplementation(key => {
        const hash = storage.get(key);
        return Promise.resolve(hash || {});
      }),
      sadd: vi.fn().mockImplementation((key, ...members) => {
        const set = new Set(storage.get(key) || []);
        members.forEach(member => set.add(member));
        storage.set(key, Array.from(set));
        return Promise.resolve(members.length);
      }),
      srem: vi.fn().mockImplementation((key, ...members) => {
        const set = new Set(storage.get(key) || []);
        members.forEach(member => set.delete(member));
        storage.set(key, Array.from(set));
        return Promise.resolve(members.length);
      }),
      smembers: vi.fn().mockImplementation(key => {
        return Promise.resolve(storage.get(key) || []);
      }),
      exists: vi.fn().mockImplementation(key => Promise.resolve(storage.has(key) ? 1 : 0)),
      expire: vi.fn().mockResolvedValue(1),
      flushall: vi.fn().mockImplementation(() => {
        storage.clear();
        return Promise.resolve('OK');
      }),
      flushdb: vi.fn().mockImplementation(() => {
        storage.clear();
        return Promise.resolve('OK');
      }),
      quit: vi.fn().mockResolvedValue('OK'),
    };

    return client;
  };

  const mockClient = createMockRedisClient();
  return {
    redis: mockClient,
    closeRedisConnection: vi.fn().mockResolvedValue(undefined),
  };
});

// Mock fetch globally
global.fetch = vi.fn();

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Clean up after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Clean up Redis connection after all tests
afterAll(async () => {
  await closeRedisConnection();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
