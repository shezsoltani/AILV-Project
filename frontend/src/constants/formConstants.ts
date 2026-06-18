import type { GenerateRequestFormValues, QuestionType } from '../types/generate';


// Verfügbare Fragetypen für das Formular
export const QUESTION_TYPE_OPTIONS: QuestionType[] = [
  'SCQ',
  'MCQ',
  'SHORT_ANSWER',
  'TRUE_FALSE',
];

// Zeigt den deutschen Namen für einen Fragetyp an
export const getQuestionTypeLabel = (type: QuestionType | string): string => {
  switch (type) {
    case 'SCQ':
      return 'SCQ (Single Choice)';
    case 'MCQ':
      return 'MCQ (Multiple Response)';
    case 'SHORT_ANSWER':
      return 'Kurzantwort (Freitext)';
    case 'TRUE_FALSE':
      return 'Wahr/Falsch';
    default:
      return type;
  }
};

// Voreingestellte Werte für das Formular
export const DEFAULT_FORM_VALUES: GenerateRequestFormValues = {
  topic: '',
  language: 'de',
  count: 5,
  types: ['SCQ'],
  difficultyDistribution: {
    easy: 40,
    medium: 40,
    hard: 20,
  },
  contextText: undefined,
  uploadContext: undefined,
};
