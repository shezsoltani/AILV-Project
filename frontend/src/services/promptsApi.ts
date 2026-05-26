// src/services/promptsApi.ts
// API-Calls für Prompt-Preview (fragen- und folienübergreifend).

import type { GenerateRequestFormValues } from '../types/generate';
import type { PromptPreviewRequest, PromptPreviewResponse } from '../types/prompts';
import type { SlidesFormValues } from '../hooks/slides/useSlidesGenerateForm';
import { toNumber } from '../utils/numberUtils';
import { apiCall, API_BASE_URL } from './apiClient';

export function toQuestionsPromptPreviewRequest(
  formValues: GenerateRequestFormValues
): PromptPreviewRequest {
  return {
    topic: formValues.topic,
    language: formValues.language,
    request_type: 'questions',
    count: toNumber(formValues.count),
    types: formValues.types,
    difficulty_distribution: {
      easy: toNumber(formValues.difficultyDistribution.easy),
      medium: toNumber(formValues.difficultyDistribution.medium),
      hard: toNumber(formValues.difficultyDistribution.hard),
    },
    ...(formValues.contextText && { context_text: formValues.contextText }),
    ...(formValues.uploadContext && { upload_context: formValues.uploadContext }),
  };
}

export function toSlidesPromptPreviewRequest(
  formValues: SlidesFormValues
): PromptPreviewRequest {
  const trimmedContext = formValues.contextText.trim();
  const slideCount =
    formValues.slideCount === '' ? '' : Number(formValues.slideCount);

  return {
    topic: formValues.topic,
    language: formValues.language,
    request_type: 'slides',
    slide_count: toNumber(slideCount),
    ...(trimmedContext ? { context_text: trimmedContext } : {}),
    ...(formValues.uploadContext ? { upload_context: formValues.uploadContext } : {}),
  };
}

export async function getPromptPreview(
  request: PromptPreviewRequest
): Promise<PromptPreviewResponse> {
  return await apiCall<PromptPreviewResponse>(
    `${API_BASE_URL}/api/prompts/preview`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    }
  );
}
