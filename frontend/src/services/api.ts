import type { GenerateRequestFormValues } from '../types/generate';
import type { GeneratedQuestion } from '../types/generatedQuestion';
import type {
  GenerateResponseDto,
  FinalizeRequest,
  FinalizeResponse,
} from '../types/api';
import { toNumber } from '../utils/numberUtils';
import { handleApiError } from '../utils/apiUtils';
import { DEFAULT_ERROR_MESSAGES } from '../constants/appConstants';

const API_BASE_URL = import.meta.env.VITE_API_BASE;

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE is not defined');
}

// API-Wrapper für einheitliche Fehlerbehandlung
async function apiCall<T>(url: string, options: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new Error(DEFAULT_ERROR_MESSAGES.BACKEND_UNREACHABLE);
  }

  if (!response.ok) {
    await handleApiError(response);
  }

  try {
    const data: T = await response.json();
    return data;
  } catch {
    throw new Error(DEFAULT_ERROR_MESSAGES.INVALID_JSON_RESPONSE);
  }
}

export async function generateQuestions(
  formValues: GenerateRequestFormValues
): Promise<{ questions: GeneratedQuestion[]; requestId: string }> {
  // Formularwerte in das Backend-Format umwandeln
  const payload = {
    topic: formValues.topic,
    language: formValues.language,
    count: toNumber(formValues.count),
    types: formValues.types,
    difficulty_distribution: {
      easy: toNumber(formValues.difficultyDistribution.easy),
      medium: toNumber(formValues.difficultyDistribution.medium),
      hard: toNumber(formValues.difficultyDistribution.hard),
    },
  };

  const data: GenerateResponseDto = await apiCall<GenerateResponseDto>(
    `${API_BASE_URL}/api/generate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  // Backend kann die Anfrage ablehnen, dann wird eine Fehlermeldung geworfen
  if (!data.accepted) {
    throw new Error(data.note || 'Generierung fehlgeschlagen.');
  }
  
  return { questions: data.questions, requestId: data.request_id };
}

export async function finalizeQuestions(
  payload: FinalizeRequest
): Promise<FinalizeResponse> {
  return await apiCall<FinalizeResponse>(
    `${API_BASE_URL}/api/finalize`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );
}

