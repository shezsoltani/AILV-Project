// src/services/apiClient.ts
// Zentrale Hilfsfunktionen für Backend-Aufrufe: Auth-Header setzen, Antworten lesen und Fehler sauber behandeln.

import { handleApiError } from '../error-handling/apiErrorParser';
import { NetworkError, ParseError } from '../error-handling/AppErrors';

export const API_BASE_URL = import.meta.env.VITE_API_BASE;
const AUTH_TOKEN_STORAGE_KEY = 'authToken';

// Wird von AuthContext beim Start gesetzt, damit apiClient bei 401 automatisch ausloggen kann.
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler;
}

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE is not defined');
}

export interface ApiCallOptions extends RequestInit {
  token?: string | null; // z. B. beim Login bewusst keinen gespeicherten Token mitsenden
}

function isLikelyJson(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
}

function getStoredAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

function createRequestHeaders(options: ApiCallOptions): Headers {
  const headers = new Headers(options.headers);
  const token = options.token ?? getStoredAuthToken();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

async function parseResponse<T>(response: Response): Promise<T> {
  // Bei 204/205 liefert das Backend absichtlich keinen Inhalt zurück.
  if (response.status === 204 || response.status === 205) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  const raw = await response.text();

  if (!raw.trim()) {
    return undefined as T;
  }

  if (contentType.includes('application/json') || isLikelyJson(raw)) {
    return JSON.parse(raw) as T;
  }

  throw new ParseError('Antwort vom Backend hatte ein unerwartetes Format (kein JSON).');
}

export async function apiCall<T>(url: string, options: ApiCallOptions): Promise<T> {
  let response: Response;
  const requestOptions: RequestInit = {
    ...options,
    headers: createRequestHeaders(options),
  };

  try {
    response = await fetch(url, requestOptions);
  } catch {
    throw new NetworkError('Backend nicht erreichbar. Bitte später erneut versuchen.');
  }

  if (!response.ok) {
    if (response.status === 401 && unauthorizedHandler) {
      unauthorizedHandler();
    }
    await handleApiError(response, url); // HTTP-Fehler an einer Stelle in lesbare App-Fehler übersetzen
  }

  try {
    return await parseResponse<T>(response);
  } catch (error) {
    if (error instanceof ParseError) {
      throw error;
    }
    throw new ParseError('Antwort vom Backend konnte nicht als JSON gelesen werden.');
  }
}
