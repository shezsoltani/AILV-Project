// src/services/authApi.ts
// API-Calls für Registrierung und Anmeldung, damit die UI schlank bleibt.

import type { LoginResponse } from '../types/auth';
import { apiCall, API_BASE_URL } from './apiClient';

export async function registerUser(
  username: string,
  email: string,
  password: string
): Promise<void> {
  await apiCall(
    `${API_BASE_URL}/api/auth/register`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        email,
        password,
      }),
    }
  );
}

export async function loginUser(
  username: string,
  password: string
): Promise<LoginResponse> {
  return await apiCall<LoginResponse>(
    `${API_BASE_URL}/api/auth/login`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
      }),
      token: null, // vor dem Login keinen alten Token aus dem Speicher anhängen
    }
  );
}
