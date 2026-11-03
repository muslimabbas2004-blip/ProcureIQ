import { createContext, useContext, useState, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { Role } from '../types';
import * as svc from '../services/authService';

interface U {
  email: string;
  name: string;
  role: Role;
}

const C = createContext<{
  user: U | null;
  signIn: (e: string, p: string) => Promise<void>;
  signOut: () => void;
}>(null!);

export const useAuth = () => useContext(C);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<U | null>(() => {
    try {
      return JSON.parse(sessionStorage.getItem('piq') ?? 'null');
    } catch {
      return null;
    }
  });

  return (
    <C.Provider
      value={{
        user,
        signIn: async (e, p) => {
          const u = await svc.login(e, p);
          sessionStorage.setItem('piq', JSON.stringify(u));
          setUser(u);
        },
        signOut: () => {
          svc.logout();
          sessionStorage.removeItem('piq');
          setUser(null);
        }
      }}
    >
      {children}
    </C.Provider>
  );
}

export function Guard({ role, children }: { role?: Role; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role === 'admin' && user.role !== 'admin') return <Navigate to="/app" replace />;
  return <>{children}</>;
}
