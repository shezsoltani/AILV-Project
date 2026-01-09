// App-weite Konstanten

// Zeit in Millisekunden, die Erfolgsmeldung angezeigt wird
export const SUCCESS_MESSAGE_DISPLAY_TIME = 2000;

// Tastatur-Key für ESC-Taste
export const ESCAPE_KEY = 'Escape';

// Standard-Fehlermeldungen
export const DEFAULT_ERROR_MESSAGES = {
  GENERATE_FAILED: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
  FINALIZE_FAILED: 'Ein Fehler ist beim Finalisieren aufgetreten.',
  BACKEND_UNREACHABLE: 'Backend nicht erreichbar. Bitte später erneut versuchen.',
  INVALID_JSON_RESPONSE: 'Antwort vom Backend konnte nicht als JSON gelesen werden.',
  NO_REQUEST_ID: 'Keine Request-ID vorhanden.',
  NO_QUESTIONS: 'Keine Fragen zum Finalisieren vorhanden.',
} as const;
