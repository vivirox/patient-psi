import { renderHook as renderHookRTL } from '@testing-library/react-hooks';
import { ReactNode } from 'react';

// Create a wrapper component that provides any necessary context
const Wrapper = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};

// Custom renderHook that uses our wrapper
export function renderHook<TProps, TResult>(
  callback: (props: TProps) => TResult,
  options?: { initialProps?: TProps }
) {
  return renderHookRTL(callback, {
    wrapper: Wrapper,
    ...options,
  });
}

// Re-export everything else from RTL
export * from '@testing-library/react-hooks';
