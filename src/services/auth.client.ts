export interface LoginCredentials {
  username: string;
  password: string;
}

let activeLoginPromise: Promise<void> | null = null;

async function performLogin(credentials: LoginCredentials): Promise<void> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(errorBody.error ?? 'Login failed');
  }
}

export function ensureAuthenticated(credentials: LoginCredentials): Promise<void> {
  if (!activeLoginPromise) {
    activeLoginPromise = performLogin(credentials).catch((error) => {
      activeLoginPromise = null;
      throw error;
    });
  }

  return activeLoginPromise;
}

export function clearCachedLogin(): void {
  activeLoginPromise = null;
}
