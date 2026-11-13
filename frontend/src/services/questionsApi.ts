// src/services/questionsApi.ts
// API-Aufrufe für Fragengenerierung, Finalisierung und Fragenarchiv.

import type { GenerateRequestFormValues } from '../types/generate';
import type { GeneratedQuestion } from '../types/generatedQuestion';

import type {
  FinalizeRequest,
  FinalizeResponse,
  ArchiveFilterOptions,
  ArchiveTopicsResponse,
  ArchiveQuestionsResponse,
  ArchiveDeleteResponse,
} from '../types/api';

import type { JobCreateResponse } from '../types/jobs';

import { toNumber } from '../utils/numberUtils';
import { apiCall, API_BASE_URL } from './apiClient';

// Startet die asynchrone Fragengenerierung.
// Anbieter, Modell und sämtliche bisherigen Formulareingaben
// werden gemeinsam als JSON an das Backend übergeben.
export async function generateQuestions(
  formValues: GenerateRequestFormValues,
): Promise<JobCreateResponse> {
  const payload = {
    topic: formValues.topic,
    language: formValues.language,

    // Ohne explizite Auswahl bleibt OpenAI der Standard.
    provider: formValues.provider ?? 'openai',

    // Ohne Modellangabe löst das Backend das Standardmodell auf.
    ...(formValues.model ? { model: formValues.model } : {}),

    count: toNumber(formValues.count),
    types: formValues.types,

    difficulty_distribution: {
      easy: toNumber(formValues.difficultyDistribution.easy),
      medium: toNumber(formValues.difficultyDistribution.medium),
      hard: toNumber(formValues.difficultyDistribution.hard),
    },

    ...(formValues.contextText
      ? { context_text: formValues.contextText }
      : {}),

    ...(formValues.uploadContext
      ? { upload_context: formValues.uploadContext }
      : {}),

    ...(formValues.customPrompts
      ? { custom_prompts: formValues.customPrompts }
      : {}),
  };

  return apiCall<JobCreateResponse>(
    `${API_BASE_URL}/api/generate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
}

// Schließt eine Fragensitzung ab und speichert sie im Archiv.
export async function finalizeQuestions(
  payload: FinalizeRequest,
): Promise<FinalizeResponse> {
  return apiCall<FinalizeResponse>(
    `${API_BASE_URL}/api/finalize`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
}

// Lädt die Themen aus dem Fragenarchiv.
// Ein optionaler Suchbegriff wird als Query-Parameter übergeben.
export async function getArchiveTopics(
  searchTerm?: string,
  filter?: ArchiveFilterOptions,
): Promise<ArchiveTopicsResponse> {
  const url = new URL(`${API_BASE_URL}/api/archive/topics`);
  const trimmedSearchTerm = searchTerm?.trim();

  if (trimmedSearchTerm) {
    url.searchParams.set('q', trimmedSearchTerm);
  }

  if (filter?.courseIds && filter.courseIds.length > 0) {
    filter.courseIds.forEach((courseId) => {
      url.searchParams.append('course_id', courseId);
    });
  } else if (filter?.unassigned) {
    url.searchParams.set('unassigned', 'true');
  }

  return apiCall<ArchiveTopicsResponse>(url.toString(), {
    method: 'GET',
  });
}

// Lädt die archivierten Fragen eines Eintrags.
export async function getArchiveQuestions(
  requestId: string,
  filter?: ArchiveFilterOptions,
): Promise<ArchiveQuestionsResponse> {
  const url = new URL(
    `${API_BASE_URL}/api/archive/${encodeURIComponent(requestId)}/questions`,
  );

  if (filter?.courseIds && filter.courseIds.length > 0) {
    filter.courseIds.forEach((courseId) => {
      url.searchParams.append('course_id', courseId);
    });
  } else if (filter?.unassigned) {
    url.searchParams.set('unassigned', 'true');
  }

  return apiCall<ArchiveQuestionsResponse>(url.toString(), {
    method: 'GET',
  });
}

// Speichert bearbeitete Fragen eines Archiveintrags.
export async function updateArchiveQuestions(
  requestId: string,
  questions: GeneratedQuestion[],
): Promise<ArchiveQuestionsResponse> {
  const payload = {
    questions: questions.map((question) => ({
      id: question.id,
      difficulty: question.difficulty,
      question: question.question,
      choices: question.choices,
      correct_index: question.correct_index,
      correct_indices: question.correct_indices,
      answer: question.answer,
      rationale: question.rationale,
    })),
  };

  return apiCall<ArchiveQuestionsResponse>(
    `${API_BASE_URL}/api/archive/${encodeURIComponent(requestId)}/questions`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
}

// Löscht einen vollständigen Archiveintrag.
export async function deleteArchiveEntry(
  requestId: string,
): Promise<ArchiveDeleteResponse> {
  return apiCall<ArchiveDeleteResponse>(
    `${API_BASE_URL}/api/archive/${encodeURIComponent(requestId)}`,
    {
      method: 'DELETE',
    },
  );
}