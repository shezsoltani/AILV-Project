import type { GenerateRequestFormValues } from '../types/generate';
import type { GeneratedQuestion } from '../types/generatedQuestion';
import type {
  GenerateResponseDto,
  FinalizeRequest,
  FinalizeResponse,
} from '../types/api';
import { toNumber } from '../utils/numberUtils';
import { handleApiError } from '../utils/apiUtils';

const API_BASE_URL = import.meta.env.VITE_API_BASE;

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE is not defined');
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

  let response: Response;
  try {
    // Anfrage an Backend senden
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
    await handleApiError(response);
  }

  try {
    const data: GenerateResponseDto = await response.json();
    // Backend kann die Anfrage ablehnen, dann wird eine Fehlermeldung geworfen
    if (!data.accepted) {
      throw new Error(data.note || 'Generierung fehlgeschlagen.');
    }
    
    return { questions: data.questions, requestId: data.request_id };
  } catch {
    throw new Error('Antwort vom Backend konnte nicht als JSON gelesen werden.');
  }
}

export async function finalizeQuestions(
  payload: FinalizeRequest
): Promise<FinalizeResponse> {
  let response: Response;
  try {
    // Finalisierte Fragen an Backend senden
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
    await handleApiError(response);
  }

  try {
    const data: FinalizeResponse = await response.json();
    return data;
  } catch {
    throw new Error('Antwort vom Backend konnte nicht als JSON gelesen werden.');
  }
}

