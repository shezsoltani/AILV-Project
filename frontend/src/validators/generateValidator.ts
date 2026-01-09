// src/validators/generateValidator.ts
import type { GenerateRequestFormValues } from '../types/generate';

// Addiert alle Schwierigkeitsgrade zusammen
export const getDifficultyTotal = (values: GenerateRequestFormValues): number => {
  const { easy, medium, hard } = values.difficultyDistribution;

  const toNumber = (value: number | '' | undefined): number => {
    if (value === '' || value === undefined || Number.isNaN(Number(value))) {
      return 0;
    }
    return Number(value);
  };

  return toNumber(easy) + toNumber(medium) + toNumber(hard);
};


// Validierungsfehler-Interface
export interface ValidationErrors {
  topic?: string;
  count?: string;
  types?: string;
  difficulty?: string;
  difficultyEasy?: string;
  difficultyMedium?: string;
  difficultyHard?: string;
}

// Hilfsfunktion: Prüft ob eine Zahl eine Ganzzahl ist
const isInteger = (value: number | ''): boolean => {
  if (value === '') return true; // Leere Werte werden separat validiert
  return Number.isInteger(value);
};

// Hilfsfunktion: Konvertiert einen Wert zu einer Zahl oder gibt 0 zurück
const toNumber = (value: number | '' | undefined): number => {
  if (value === '' || value === undefined || Number.isNaN(Number(value))) {
    return 0;
  }
  return Number(value);
};

// Prüft ob alle Formularwerte korrekt sind
export const validate = (values: GenerateRequestFormValues): ValidationErrors => {
  const errors: ValidationErrors = {};

  // Thema muss mindestens 3 Zeichen haben
  if (values.topic.trim().length < 3) {
    errors.topic = 'Thema muss mindestens 3 Zeichen lang sein.';
  }

  // Mindestens ein Fragetyp muss ausgewählt sein
  if (!values.types || values.types.length === 0) {
    errors.types = 'Mindestens ein Fragetyp muss ausgewählt sein.';
  }

  // Anzahl Fragen: Minimum 1, Maximum 50, nur Ganzzahlen
  if (values.count === '') {
    errors.count = 'Die Anzahl der Fragen ist erforderlich.';
  } else {
    const count = toNumber(values.count);
    if (!isInteger(values.count)) {
      errors.count = 'Die Anzahl der Fragen muss eine Ganzzahl sein (keine Kommastellen).';
    } else if (count < 1) {
      errors.count = 'Die Anzahl der Fragen muss mindestens 1 betragen.';
    } else if (count > 50) {
      errors.count = 'Die Anzahl der Fragen darf maximal 50 betragen.';
    }
  }

  // Schwierigkeitsverteilung: Einzelne Werte validieren
  const { easy, medium, hard } = values.difficultyDistribution;

  // Einfach validieren
  if (easy === '') {
    errors.difficultyEasy = 'Dieses Feld ist erforderlich.';
  } else {
    const easyNum = toNumber(easy);
    if (!isInteger(easy)) {
      errors.difficultyEasy = 'Nur Ganzzahlen erlaubt (keine Kommastellen).';
    } else if (easyNum < 0 || easyNum > 100) {
      errors.difficultyEasy = 'Der Wert muss zwischen 0 und 100 liegen.';
    }
  }

  // Mittel validieren
  if (medium === '') {
    errors.difficultyMedium = 'Dieses Feld ist erforderlich.';
  } else {
    const mediumNum = toNumber(medium);
    if (!isInteger(medium)) {
      errors.difficultyMedium = 'Nur Ganzzahlen erlaubt (keine Kommastellen).';
    } else if (mediumNum < 0 || mediumNum > 100) {
      errors.difficultyMedium = 'Der Wert muss zwischen 0 und 100 liegen.';
    }
  }

  // Schwer validieren
  if (hard === '') {
    errors.difficultyHard = 'Dieses Feld ist erforderlich.';
  } else {
    const hardNum = toNumber(hard);
    if (!isInteger(hard)) {
      errors.difficultyHard = 'Nur Ganzzahlen erlaubt (keine Kommastellen).';
    } else if (hardNum < 0 || hardNum > 100) {
      errors.difficultyHard = 'Der Wert muss zwischen 0 und 100 liegen.';
    }
  }

  // Schwierigkeitsverteilung: Summe muss genau 100% ergeben
  // Nur prüfen, wenn keine Einzelfehler vorhanden sind
  if (!errors.difficultyEasy && !errors.difficultyMedium && !errors.difficultyHard) {
    const total = getDifficultyTotal(values);
    if (total !== 100) {
      errors.difficulty =
        'Die Summe der Schwierigkeitsgrade (einfach + mittel + schwer) muss exakt 100% ergeben.';
    }
  }

  return errors;
};

