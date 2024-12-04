import { useState, useEffect } from 'react';
import type { User } from '../types/user';

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check');
        if (!response.ok) {
          throw new Error('Not authenticated');
        }
        const user = await response.json();
        setState({ user, isLoading: false, error: null });
      } catch (error) {
        setState({ user: null, isLoading: false, error: error as Error });
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        throw new Error('Login failed');
      }
      const user = await response.json();
      setState({ user, isLoading: false, error: null });
      return user;
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false, error: error as Error }));
      throw error;
    }
  };

  const logout = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setState({ user: null, isLoading: false, error: null });
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false, error: error as Error }));
      throw error;
    }
  };

  return {
    user: state.user,
    isLoading: state.isLoading,
    error: state.error,
    login,
    logout,
  };
}
