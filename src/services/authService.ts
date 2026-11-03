import type { Role } from '../types';
import { API, http } from './api';

const accts: Record<string, { role: Role; name: string }> = {
  'procurement@demo.com': { role: 'user', name: 'Purchase Department' },
  'purchase@demo.com': { role: 'user', name: 'Purchase Department' },
  'admin@demo.com': { role: 'admin', name: 'Hemani Purchase' }
};

export const DEMO_PASSWORD = 'Demo@1234';

export interface AuthUser {
  email: string;
  name: string;
  role: Role;
}

export async function login(email: string, pw: string): Promise<AuthUser> {
  if (!API.mock) {
    try {
      return await http<AuthUser>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: pw })
      });
    } catch (err) {
      // If server is not responding, fallback to mock if allowed
      console.warn('Backend login failed, checking fallback:', err);
      throw err;
    }
  }

  // Simulation mode
  await new Promise(r => setTimeout(r, 300));
  const a = accts[email.trim().toLowerCase()];
  if (!a || pw !== DEMO_PASSWORD) {
    throw new Error('Invalid email or password.');
  }
  return { email, ...a };
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!API.mock) {
    try {
      return await http<AuthUser>('/api/auth/me');
    } catch {
      return null;
    }
  }
  return null;
}

export async function logout(): Promise<void> {
  if (!API.mock) {
    try {
      await http('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn('Backend logout failed:', err);
    }
  }
}
