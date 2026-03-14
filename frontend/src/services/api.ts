// src/services/api.ts
// API-Client: einheitliche Requests und typisierte Fehler für das Frontend
import type { GenerateRequestFormValues } from '../types/generate';
import type { GeneratedQuestion } from '../types/generatedQuestion';
import type {
  GenerateResponseDto,
  FinalizeRequest,
  FinalizeResponse,
  ArchiveTopicsResponse,
  ArchiveQuestionsResponse,
} from '../types/api';
import { toNumber } from '../utils/numberUtils';
import { handleApiError } from '../utils/apiUtils';
import { NetworkError, ParseError, ApiError } from '../errors/AppErrors';

const API_BASE_URL = import.meta.env.VITE_API_BASE;

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE is not defined');
}

// Fallback, falls der Server den Content-Type nicht korrekt setzt
function isLikelyJson(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
}

async function parseResponse<T>(response: Response): Promise<T> {
  // 204/205: bewusst kein Body
  if (response.status === 204 || response.status === 205) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  const raw = await response.text();

  // Leerer Body ist ok (einige Endpoints liefern 200 ohne Content)
  if (!raw.trim()) {
    return undefined as T;
  }

  if (contentType.includes('application/json') || isLikelyJson(raw)) {
    return JSON.parse(raw) as T;
  }

  throw new ParseError('Antwort vom Backend hatte ein unerwartetes Format (kein JSON).');
}

async function apiCall<T>(url: string, options: RequestInit): Promise<T> {
  let response: Response;
  
  try {
    response = await fetch(url, options);
  } catch (error) {
    throw new NetworkError('Backend nicht erreichbar. Bitte später erneut versuchen.');
  }

  if (!response.ok) {
    await handleApiError(response, url);
  }

  try {
    return await parseResponse<T>(response);
  } catch (error) {
    if (error instanceof ParseError) {
      throw error;
    }
    throw new ParseError('Antwort vom Backend konnte nicht als JSON gelesen werden.');
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
    throw new ApiError(
      data.note || 'Generierung fehlgeschlagen.',
      400,
      'GENERATION_REJECTED'
    );
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

// Archive API Functions
export async function getArchiveTopics(): Promise<ArchiveTopicsResponse> {
  return await apiCall<ArchiveTopicsResponse>(
    `${API_BASE_URL}/api/archive/topics`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

export async function getArchiveQuestions(
  requestId: string
): Promise<ArchiveQuestionsResponse> {
  return await apiCall<ArchiveQuestionsResponse>(
    `${API_BASE_URL}/api/archive/${requestId}/questions`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}
