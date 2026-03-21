// src/utils/errorUtils.ts
// UI-Helfer: technische Errors in verständliche Fehlermeldungen für Nutzer übersetzen
import { AppError, ApiError, NetworkError } from '../errors/AppErrors';
import { API_ERROR_CODE_MESSAGES } from '../constants/errorConstants';

export const getUserFriendlyMessage = (error: unknown): string => {
  if (error instanceof NetworkError) {
    return error.message || 'Backend nicht erreichbar. Bitte prüfen Sie Ihre Internetverbindung.';
  }

  if (error instanceof ApiError) {
    // Erst bekannte Backend-Codes mappen, danach generische Status-Fallbacks
    const mapped = API_ERROR_CODE_MESSAGES[error.code];
    if (mapped) return mapped;

    if (error.statusCode === 404) {
      return 'Die angeforderte Ressource wurde nicht gefunden.';
    }
    if (error.statusCode === 403) {
      return 'Sie haben keine Berechtigung für diese Aktion.';
    }
    if (error.statusCode && error.statusCode >= 500) {
      return 'Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.';
    }

    return error.message;
  }

  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Ein unerwarteter Fehler ist aufgetreten.';
};

export const getRegistrationErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError && error.statusCode === 409) {
    const normalizedMessage = error.message.toLowerCase();

    if (normalizedMessage.includes('username')) {
      return 'Dieser Benutzername ist bereits vergeben.';
    }

    if (normalizedMessage.includes('email')) {
      return 'Diese E-Mail-Adresse ist bereits registriert.';
    }
  }

  return getUserFriendlyMessage(error);
};

export function getLoginErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.statusCode === 401) {
    return 'Benutzername oder Passwort sind nicht korrekt.';
  }

  return getUserFriendlyMessage(error);
}
