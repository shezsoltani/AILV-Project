// Übersetzt technische Fehler-Objekte in verständliche Fehlermeldungen für die UI.
import { AppError, ApiError, NetworkError } from './AppErrors';
import { ERROR_CODE_MESSAGES } from './errorCodes';

export const getUserFriendlyMessage = (error: unknown): string => {
  if (error instanceof NetworkError) {
    return error.message || 'Backend nicht erreichbar. Bitte prüfen Sie Ihre Internetverbindung.';
  }

  if (error instanceof ApiError) {
    // Zuerst bekannte Backend-Codes mappen
    const mapped = ERROR_CODE_MESSAGES[error.code];
    if (mapped) return mapped;

    // Generische Status-Fallbacks
    if (error.statusCode === 404) return 'Die angeforderte Ressource wurde nicht gefunden.';
    if (error.statusCode === 403) return 'Sie haben keine Berechtigung für diese Aktion.';
    if (error.statusCode === 422) return 'Bitte prüfen Sie Ihre Eingaben und versuchen Sie es erneut.';
    if (error.statusCode && error.statusCode >= 500) {
      return 'Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.';
    }

    return error.message;
  }

  if (error instanceof AppError) return error.message;
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;

  return 'Ein unerwarteter Fehler ist aufgetreten.';
};

export const getRegistrationErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError && error.code === 'auth_username_exists') {
    return 'Dieser Benutzername ist bereits vergeben.';
  }
  if (error instanceof ApiError && error.code === 'auth_email_exists') {
    return 'Diese E-Mail-Adresse ist bereits registriert.';
  }

  // Fallback für ältere Backend-Fehler ohne code-Feld
  if (error instanceof ApiError && error.statusCode === 409) {
    const msg = error.message.toLowerCase();
    if (msg.includes('username')) return 'Dieser Benutzername ist bereits vergeben.';
    if (msg.includes('email')) return 'Diese E-Mail-Adresse ist bereits registriert.';
  }

  return getUserFriendlyMessage(error);
};

export function getLoginErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === 'auth_invalid_credentials') {
    return 'Benutzername oder Passwort sind nicht korrekt.';
  }

  // Fallback für ältere Backend-Fehler ohne code-Feld
  if (error instanceof ApiError && error.statusCode === 401) {
    return 'Benutzername oder Passwort sind nicht korrekt.';
  }

  return getUserFriendlyMessage(error);
}
