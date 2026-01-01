import type { GenerateRequestFormValues } from '../types/generate';
import type { GeneratedQuestion } from '../types/generatedQuestion';

const API_BASE_URL = import.meta.env.VITE_API_BASE;

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE is not defined');
}

interface GenerateResponseDto {
  accepted: boolean;
  topic: string;
  language: string;
  count: number;
  questions: GeneratedQuestion[];
  note: string;
  request_id: string;
}

export async function generateQuestions(
  formValues: GenerateRequestFormValues
): Promise<{ questions: GeneratedQuestion[]; requestId: string }> {
  // Payload so bauen, dass es exakt zu GenerateRequest im Backend passt:
  const payload = {
    topic: formValues.topic,
    language: formValues.language,
    count:
      typeof formValues.count === 'string'
        ? Number(formValues.count)
        : formValues.count,
    types: formValues.types,
    difficulty_distribution: {
      easy: Number(formValues.difficultyDistribution.easy),
      medium: Number(formValues.difficultyDistribution.medium),
      hard: Number(formValues.difficultyDistribution.hard),
    },
  };

  let response: Response;
  try {
  response = await fetch(`${API_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  } catch {
    throw new Error('Backend nicht erreichbar. Bitte später erneut versuchen.');
  }

  if (!response.ok) {
    const raw = await response.text().catch(() => '');
    const contentType = response.headers.get('content-type') ?? '';
  
    if (contentType.includes('application/json')) {
      try {
        const errJson = await response.json();
        const message =
          (typeof errJson?.message === 'string' && errJson.message) ||
          (typeof errJson?.detail === 'string' && errJson.detail) ||
          (raw ? raw : 'Unbekannter Fehler');
  
        throw new Error(`Backend-Fehler (${response.status}): ${message}`);
      } catch {
        const clean = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        throw new Error(
          `Backend-Fehler (${response.status})` +
          (clean ? `: ${clean.slice(0, 300)}` : ': Ungültige JSON-Fehlerantwort'),
        );
      }
    }
  
    const clean = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    throw new Error(
      `Backend-Fehler (${response.status} ${response.statusText})` +
        (clean ? `: ${clean.slice(0, 300)}` : ''),
    );
  }

  try {
    const data: GenerateResponseDto = await response.json();
    if (!data.accepted) {
      throw new Error(data.note || 'Generierung fehlgeschlagen.');
    }
    
    return { questions: data.questions, requestId: data.request_id };
  } catch {
    throw new Error('Antwort vom Backend konnte nicht als JSON gelesen werden.');
  }
}

export interface FinalQuestion {
  generated_question_id: string;  // UUID
  type?: string;
  difficulty?: string;
  stem?: string;
  choices?: string[];
  correct_index?: number;
  rationale?: string;
}

export interface FinalizeRequest {
  request_id: string;  // UUID
  questions: FinalQuestion[];
}

export interface FinalizeResponse {
  success: boolean;
  request_id: string;  // UUID
  finalized_count: number;
  message: string;
}

export async function finalizeQuestions(
  payload: FinalizeRequest
): Promise<FinalizeResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Backend nicht erreichbar. Bitte später erneut versuchen.');
  }

  if (!response.ok) {
    const raw = await response.text().catch(() => '');
    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      try {
        const errJson = await response.json();
        const message =
          (typeof errJson?.message === 'string' && errJson.message) ||
          (typeof errJson?.detail === 'string' && errJson.detail) ||
          (raw ? raw : 'Unbekannter Fehler');

        throw new Error(`Backend-Fehler (${response.status}): ${message}`);
      } catch {
        const clean = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        throw new Error(
          `Backend-Fehler (${response.status})` +
          (clean ? `: ${clean.slice(0, 300)}` : ': Ungültige JSON-Fehlerantwort'),
        );
      }
    }

    const clean = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    throw new Error(
      `Backend-Fehler (${response.status} ${response.statusText})` +
        (clean ? `: ${clean.slice(0, 300)}` : ''),
    );
  }

  try {
    const data: FinalizeResponse = await response.json();
    return data;
  } catch {
    throw new Error('Antwort vom Backend konnte nicht als JSON gelesen werden.');
  }
}

