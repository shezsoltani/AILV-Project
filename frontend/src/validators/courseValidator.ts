// src/validators/courseValidator.ts
// Prüft den Namen einer Lehrveranstaltung, bevor er ans Backend geht.

// Das Backend erlaubt höchstens 255 Zeichen.
export const COURSE_NAME_MAX_LENGTH = 255;

// Entfernt Leerzeichen am Anfang und Ende, so wie es auch das Backend macht.
export function normalizeCourseName(name: string): string {
  return name.trim();
}

// Gibt eine Fehlermeldung zurück oder null, wenn der Name gültig ist.
export function validateCourseName(name: string): string | null {
  const trimmed = normalizeCourseName(name);

  if (!trimmed) {
    return 'Bitte geben Sie einen Namen ein.';
  }

  if (trimmed.length > COURSE_NAME_MAX_LENGTH) {
    return `Der Name darf höchstens ${COURSE_NAME_MAX_LENGTH} Zeichen lang sein.`;
  }

  return null;
}
