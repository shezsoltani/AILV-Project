// src/services/questionsApi.ts
// API-Calls für Fragen: generieren, abschließen und archivierte Inhalte laden.

import type { GenerateRequestFormValues } from '../types/generate';
import type { GeneratedQuestion } from '../types/generatedQuestion';
import type {
  GenerateResponseDto,
  FinalizeRequest,
  FinalizeResponse,
  ArchiveTopicsResponse,
  ArchiveQuestionsResponse,
  ArchiveDeleteResponse,
} from '../types/api';
import { toNumber } from '../utils/numberUtils';
import { ApiError } from '../error-handling/AppErrors';
import { apiCall, API_BASE_URL } from './apiClient';

export async function generateQuestions(
  formValues: GenerateRequestFormValues
): Promise<{ questions: GeneratedQuestion[]; requestId: string }> {
  // Formularwerte in das Format umwandeln, das das Backend erwartet.
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
    // Optionale Felder: nur mitsenden, wenn befüllt
    ...(formValues.contextText && { context_text: formValues.contextText }),
    ...(formValues.uploadContext && { upload_context: formValues.uploadContext }),
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

  // Das Backend kann die Anfrage fachlich ablehnen, obwohl der HTTP-Request technisch erfolgreich war.
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

export async function getArchiveTopics(searchTerm?: string): Promise<ArchiveTopicsResponse> {
  const url = new URL(`${API_BASE_URL}/api/archive/topics`);
  if (searchTerm && searchTerm.trim()) {
    url.searchParams.set('q', searchTerm.trim());
  }
  return await apiCall<ArchiveTopicsResponse>(url.toString(), { method: 'GET' });
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

// Sendet bearbeitete Fragen ins Archiv-Update und überträgt nur editierbare Felder.
export async function updateArchiveQuestions(
  requestId: string,
  questions: GeneratedQuestion[]
): Promise<ArchiveQuestionsResponse> {
  const payload = {
    questions: questions.map((q) => ({
      id: q.id,
      difficulty: q.difficulty,
      question: q.question,
      choices: q.choices,
      answer: q.answer,
      rationale: q.rationale,
    })),
  };

  return await apiCall<ArchiveQuestionsResponse>(
    `${API_BASE_URL}/api/archive/${requestId}/questions`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );
}

export async function deleteArchiveEntry(requestId: string): Promise<ArchiveDeleteResponse> {
  return await apiCall<ArchiveDeleteResponse>(
    `${API_BASE_URL}/api/archive/${requestId}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}