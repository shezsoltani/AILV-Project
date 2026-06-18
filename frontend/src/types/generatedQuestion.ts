// src/types/generatedQuestion.ts
import type { QuestionType } from './generate';

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface GeneratedQuestion {
  id: string;               // UUID
  question: string;          // Frage-Text aus dem Backend
  type: QuestionType;
  difficulty: QuestionDifficulty;
  choices?: string[];
  correct_index?: number;
  correct_indices?: number[];
  answer?: string;
  rationale?: string;
}