// src/services/promptsApi.ts
// API-Calls für Prompt-Preview (fragen- und folienübergreifend).

import type { PromptPreviewRequest, PromptPreviewResponse } from '../types/prompts';
import { apiCall, API_BASE_URL } from './apiClient';

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
