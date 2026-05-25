// src/types/prompts.ts
// Typen für Prompt-Preview (spiegelt backend/app/models/prompt_models.py)

import type { Language } from './generate';

export type PromptPreviewRequestType = 'questions' | 'slides';

export interface PromptPreviewRequest {
  topic: string;
  language: Language;
  request_type: PromptPreviewRequestType;
  count?: number;
  types?: string[];
  difficulty_distribution?: Record<string, number>;
  slide_count?: number;
  context_text?: string;
  upload_context?: string;
}

export interface RenderedPrompt {
  stage: string;
  prompt_text: string;
}

export interface PromptPreviewResponse {
  prompts: RenderedPrompt[];
}
