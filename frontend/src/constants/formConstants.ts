import type { GenerateRequestFormValues, QuestionType } from '../types/generate';


 //Verfügbare Fragetypen für das Formular
export const QUESTION_TYPE_OPTIONS: QuestionType[] = [
  'MCQ',
  'SHORT_ANSWER',
  'TRUE_FALSE',
];

// Zeigt den deutschen Namen für einen Fragetyp an
export const getQuestionTypeLabel = (type: QuestionType): string => {
  switch (type) {
    case 'MCQ':
      return 'MCQ (Multiple Choice)';
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
  types: ['MCQ'],
  difficultyDistribution: {
    easy: 40,
    medium: 40,
    hard: 20,
  },
  contextText: undefined,
  uploadContext: undefined,
};

