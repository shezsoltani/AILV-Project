// Passwort-Stärke-Auswertung für die Anzeige im Registrierungsformular (kein Ersatz für Server-Checks)

export type PasswordStrengthLevel = 'empty' | 'weak' | 'medium' | 'strong';

export interface PasswordStrengthResult {
  level: PasswordStrengthLevel;
  /** Kurzer Text für die Anzeige (Deutsch). */
  label: string;
  /** Anzahl gefüllter Balken (0–3). */
  segmentsFilled: number;
  /** Kurze Tipps, wenn noch nicht stark. */
  suggestions: string[];
}

const MIN_LENGTH = 8;

// Bewertet die Passwort-Stärke anhand von Länge und Zeichentypen
export function getPasswordStrength(password: string): PasswordStrengthResult {
  if (password.length === 0) {
    return {
      level: 'empty',
      label: '',
      segmentsFilled: 0,
      suggestions: [],
    };
  }

  const suggestions: string[] = [];
  let points = 0;

  if (password.length >= MIN_LENGTH) {
    points += 1;
  } else {
    suggestions.push(`Mindestens ${MIN_LENGTH} Zeichen`);
  }

  if (password.length >= 12) {
    points += 1;
  }

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  if (hasLower && hasUpper) {
    points += 1;
  } else {
    suggestions.push('Groß- und Kleinbuchstaben mischen');
  }

  if (/\d/.test(password)) {
    points += 1;
  } else {
    suggestions.push('Mindestens eine Ziffer');
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    points += 1;
  } else {
    suggestions.push('Sonderzeichen (z. B. !, ?, #) erhöhen die Sicherheit');
  }

  let level: PasswordStrengthLevel;
  let label: string;
  let segmentsFilled: number;

  if (password.length < MIN_LENGTH) {
    level = 'weak';
    label = 'Zu kurz';
    segmentsFilled = 1;
  } else if (points <= 2) {
    level = 'weak';
    label = 'Schwach';
    segmentsFilled = 1;
  } else if (points <= 4) {
    level = 'medium';
    label = 'Mittel';
    segmentsFilled = 2;
  } else {
    level = 'strong';
    label = 'Stark';
    segmentsFilled = 3;
  }

  const maxTips = level === 'strong' ? 0 : 2;
  return {
    level,
    label,
    segmentsFilled,
    suggestions: suggestions.slice(0, maxTips),
  };
}
