// src/services/questionsApi.ts
// API-Calls für Fragen: generieren, abschließen und archivierte Inhalte laden.

import type { GenerateRequestFormValues } from '../types/generate';
import type { GeneratedQuestion } from '../types/generatedQuestion';
import type {
  FinalizeRequest,
  FinalizeResponse,
  ArchiveTopicsResponse,
  ArchiveQuestionsResponse,
  ArchiveDeleteResponse,
} from '../types/api';
import type { JobCreateResponse } from '../types/jobs';
import { toNumber } from '../utils/numberUtils';
import { apiCall, API_BASE_URL } from './apiClient';

// Startet die asynchrone Generierung von Fragen.
export async function generateQuestions(
  formValues: GenerateRequestFormValues
): Promise<JobCreateResponse> {
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
    ...(formValues.customPrompts && { custom_prompts: formValues.customPrompts }),
  };

  // Das Backend startet die Generierung asynchron und gibt sofort job_id + status zurück.
  return await apiCall<JobCreateResponse>(
    `${API_BASE_URL}/api/generate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );
}

// Schließt eine Fragensitzung ab und speichert sie permanent.
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

// Lädt alle Themen aus dem Fragen-Archiv, optional gefiltert nach Suchbegriff.
export async function getArchiveTopics(searchTerm?: string): Promise<ArchiveTopicsResponse> {
  const url = new URL(`${API_BASE_URL}/api/archive/topics`);
  if (searchTerm && searchTerm.trim()) {
    url.searchParams.set('q', searchTerm.trim());
  }
  return await apiCall<ArchiveTopicsResponse>(url.toString(), { method: 'GET' });
}

// Lädt alle generierten Fragen zu einer bestimmten Archiv-ID.
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

// Aktualisiert bearbeitete Fragen in einem bestehenden Archiv-Eintrag.
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
      correct_index: q.correct_index,
      correct_indices: q.correct_indices,
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

// Löscht einen kompletten Eintrag aus dem Fragen-Archiv.
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