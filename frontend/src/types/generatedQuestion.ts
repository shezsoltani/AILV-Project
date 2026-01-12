// src/types/generatedQuestion.ts
import type { QuestionType } from './generate';

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface GeneratedQuestion {
  id: string;               // UUID
  question: string;          // Frage-Text aus dem Backend
  type: QuestionType;        // entspricht Question.type (string im Backend)
  difficulty: QuestionDifficulty;
  choices?: string[];        // Optionale Auswahlmöglichkeiten
  correct_index?: number;    // Index der richtigen Antwort
  rationale?: string;        // Begründung für die Antwort
}