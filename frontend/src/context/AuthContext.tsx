// src/context/AuthContext.tsx
// Zentraler Auth-Context fuer Token, Login, Logout und eine konsistente Login-UX in der ganzen App
import React, { createContext, useContext, useMemo, useState } from 'react';
import type { AuthContextValue } from '../types/auth';

// Fester Schluessel, unter dem der Token im localStorage liegt.
const AUTH_TOKEN_STORAGE_KEY = 'authToken';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

// Liest beim Start einen bereits gespeicherten Token aus dem Browser.
function getStoredToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(getStoredToken);

  // Speichert den Token dauerhaft und aktualisiert sofort den React-State.
  function login(nextToken: string): void {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, nextToken);
    setToken(nextToken);
  }

  // Entfernt den Token aus Speicher und State, also ein sauberer Logout.
  function logout(): void {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    setToken(null);
  }

  // Dieses Objekt wird spaeter allen Kind-Komponenten ueber den Context bereitgestellt.
  function createAuthContextValue(): AuthContextValue {
    return {
      token,
      isAuthenticated: Boolean(token),
      login,
      logout,
    };
  }

  const value = useMemo<AuthContextValue>(createAuthContextValue, [token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  // Schuetzt davor, den Hook ausserhalb des Providers zu verwenden.
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
