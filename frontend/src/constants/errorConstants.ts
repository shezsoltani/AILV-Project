// src/constants/errorConstants.ts
// Konstanten: Mapping von Backend-Error-Codes zu UI-Texten
export const API_ERROR_CODE_MESSAGES: Record<string, string> = {
  archive_not_found: 'Keine archivierten Fragen zu diesem Thema gefunden.',
  llm_api_error: 'Der KI-Dienst ist momentan nicht verfügbar. Bitte später erneut versuchen.',
  finalize_state_error: 'Speichern ist aktuell nicht möglich. Bitte versuchen Sie es erneut.',
  llm_invalid_json: 'Die KI-Antwort konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut.',
  invalid_skeleton: 'Die Fragen konnten nicht erstellt werden. Bitte versuchen Sie es erneut.',
  invalid_content: 'Die Fragen konnten nicht erstellt werden. Bitte versuchen Sie es erneut.',
  invalid_improved_content: 'Die Fragen konnten nicht verbessert werden. Bitte versuchen Sie es erneut.',
  archive_service_error: 'Archiv konnte nicht geladen werden. Bitte später erneut versuchen.',
};

