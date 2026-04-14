// Mapping von Backend-Error-Codes zu deutschen UI-Texten.
// Neue Backend-Codes hier eintragen, damit sie automatisch korrekt angezeigt werden.
export const ERROR_CODE_MESSAGES: Record<string, string> = {
  // Auth
  auth_username_exists: 'Dieser Benutzername ist bereits vergeben.',
  auth_email_exists: 'Diese E-Mail-Adresse ist bereits registriert.',
  auth_invalid_credentials: 'Benutzername oder Passwort sind nicht korrekt.',
  auth_current_password_incorrect: 'Das aktuelle Passwort ist nicht korrekt.',
  // Validierung
  validation_error: 'Bitte prüfen Sie Ihre Eingaben und versuchen Sie es erneut.',
  context_text_too_long: 'Der Kontexttext ist zu lang. Bitte auf maximal 5.000 Zeichen kürzen.',
  // Archiv
  archive_not_found: 'Keine archivierten Fragen zu diesem Thema gefunden.',
  archive_service_error: 'Archiv konnte nicht geladen werden. Bitte später erneut versuchen.',
  // KI/Generierung
  llm_api_error: 'Der KI-Dienst ist momentan nicht verfügbar. Bitte später erneut versuchen.',
  llm_invalid_json: 'Die KI-Antwort konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut.',
  invalid_skeleton: 'Die KI-Antwort hatte ein unerwartetes Format. Bitte versuchen Sie es erneut.',
  invalid_content: 'Die Fragen konnten nicht erstellt werden. Bitte versuchen Sie es erneut.',
  invalid_improved_content: 'Die Fragen konnten nicht verbessert werden. Bitte versuchen Sie es erneut.',
  // Finalisierung
  finalize_state_error: 'Speichern ist aktuell nicht möglich. Bitte versuchen Sie es erneut.',
};
