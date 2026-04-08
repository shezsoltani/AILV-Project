// src/context/AuthContext.tsx
// Zentraler Auth-Context fuer Token, Login, Logout und eine konsistente Login-UX in der ganzen App
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthContextValue } from '../types/auth';
import { setUnauthorizedHandler } from '../services/apiClient';

// Fester Schluessel, unter dem der Token im localStorage liegt.
const AUTH_TOKEN_STORAGE_KEY = 'authToken';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

// Liest den JWT-Payload aus und prueft, ob der Token abgelaufen ist.
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

// Liest beim Start einen gespeicherten Token aus dem Browser – abgelaufene Tokens werden sofort verworfen.
function getStoredToken(): string | null {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

  if (token && isTokenExpired(token)) {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    return null;
  }

  return token;
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

  // Registriert logout als Handler fuer 401-Antworten vom Backend.
  useEffect(function () {
    setUnauthorizedHandler(logout);
  }, []);

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
