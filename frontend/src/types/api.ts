// src/types/api.ts
// Interfaces für die API-Kommunikation
import type { GeneratedQuestion } from './generatedQuestion';

// Response DTO für die generateQuestions API
export interface GenerateResponseDto {
  accepted: boolean;
  topic: string;
  language: string;
  count: number;
  questions: GeneratedQuestion[];
  note: string;
  request_id: string;
}

// FinalQuestion Interface für die finalizeQuestions API
export interface FinalQuestion {
  generated_question_id: string;  // UUID
  type?: string;
  difficulty?: string;
  stem?: string;
  choices?: string[];
  correct_index?: number;
  answer?: string;  // Für SHORT_ANSWER: korrekte Antwort
  rationale?: string;
}

// Request Interface für die finalizeQuestions API
export interface FinalizeRequest {
  request_id: string;  // UUID
  questions: FinalQuestion[];
}

// Response Interface für die finalizeQuestions API
export interface FinalizeResponse {
  success: boolean;
  request_id: string;  // UUID
  finalized_count: number;
  message: string;
}

export interface UploadPdfResponse {
  filename: string;
  char_count: number;
  extracted_text: string;
}

// Archive Types
export interface ArchiveTopic {
  request_id: string;  // UUID
  topic: string;
  language: string;
  question_count: number;
  types: string[];  // Fragetypen (MCQ, SHORT_ANSWER, TRUE_FALSE)
  created_at: string;  // ISO datetime string
  finalized_at: string;  // ISO datetime string
}

export interface ArchiveTopicsResponse {
  topics: ArchiveTopic[];
}

export interface ArchiveQuestionsResponse {
  request_id: string;  // UUID
  topic: string;
  language: string;
  questions: GeneratedQuestion[];
}

export interface ArchiveDeleteResponse {
  success: boolean;
  request_id: string;  // UUID
  message: string;
}