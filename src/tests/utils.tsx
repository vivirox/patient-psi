import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Define a default wrapper if needed
function DefaultWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// Custom render function that includes common wrappers and configurations
function render(
  ui: React.ReactElement,
  {
    wrapper: Wrapper = DefaultWrapper,
    ...renderOptions
  }: RenderOptions & { wrapper?: React.ComponentType<{ children: React.ReactNode }> } = {}
) {
  return {
    user: userEvent.setup(),
    ...rtlRender(ui, {
      wrapper: Wrapper,
      ...renderOptions,
    }),
  };
}

// Re-export everything
export * from '@testing-library/react';
export { render, userEvent };

// Mock data generators
export const mockUserProfile = (overrides = {}) => ({
  id: 'test-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'therapist' as const,
  settings: {
    theme: 'light' as const,
    notifications: true,
    language: 'en',
  },
  metadata: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// Mock response helper
export const mockFetchResponse = (data: any, options = {}) => {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
};
