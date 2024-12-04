interface LoginData {
  email: string;
  password: string;
}

interface RegisterData extends LoginData {
  name: string;
}

export async function login(data: LoginData) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to login');
  }

  window.location.href = '/dashboard';
}

export async function register(data: RegisterData) {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to register');
  }

  window.location.href = '/dashboard';
}

export async function logout() {
  await fetch('/api/auth/logout', {
    method: 'POST',
  });
  window.location.href = '/login';
}

export async function getCurrentUser() {
  try {
    const response = await fetch('/api/auth/me');
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
