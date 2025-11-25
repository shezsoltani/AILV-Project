// src/types/generatedQuestion.ts
import type { QuestionType } from './generate';

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface GeneratedQuestion {
  question: string;          // Frage-Text aus dem Backend
  type: QuestionType;        // entspricht Question.type (string im Backend)
  difficulty: QuestionDifficulty;
}