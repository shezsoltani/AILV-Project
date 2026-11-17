import { apiCall, API_BASE_URL } from './apiClient';

export type GenerationProvider = 'openai' | 'ollama';

export interface GenerationModel {
  provider: GenerationProvider;
  model: string;
  available: boolean;
  reason: string | null;
}

export interface GenerationModelsResponse {
  models: GenerationModel[];
}

export function getGenerationModels(): Promise<GenerationModelsResponse> {
  return apiCall<GenerationModelsResponse>(
    `${API_BASE_URL}/api/generation/models`,
    { method: 'GET' },
  );
}