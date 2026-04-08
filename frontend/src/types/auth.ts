// src/types/auth.ts
// Typen fuer Auth-Formulare, Login-Antworten und den globalen Auth-State
export interface RegisterFormValues {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterValidationErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export interface LoginFormValues {
  username: string;
  password: string;
}

export interface LoginValidationErrors {
  username?: string;
  password?: string;
}

export interface ChangePasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordValidationErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

// Beschreibt, welche Werte und Funktionen der Auth-Context spaeter bereitstellt.
export interface AuthContextValue {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}
