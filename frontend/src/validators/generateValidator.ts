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
  difficulty?: string;
}

// Prüft ob alle Formularwerte korrekt sind
export const validate = (values: GenerateRequestFormValues): ValidationErrors => {
  const errors: ValidationErrors = {};

  // Thema muss mindestens 3 Zeichen haben
  if (values.topic.trim().length < 3) {
    errors.topic = 'Thema muss mindestens 3 Zeichen lang sein.';
  }

  // Schwierigkeitsverteilung muss genau 100% ergeben
  const total = getDifficultyTotal(values);
  if (total !== 100) {
    errors.difficulty =
      'Die Summe der Schwierigkeitsgrade (einfach + mittel + schwer) muss exakt 100% ergeben.';
  }

  return errors;
};

