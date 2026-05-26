// src/services/slidesApi.ts
// API-Calls für Folien: generieren, speichern und archivierte Decks laden.

import type {
  SlidesGenerateRequest,
  SlideDraft,
  FinalizeSlidesRequest,
  FinalizeSlidesResponse,
  DeckListResponse,
  DeckDetailResponse,
  DeckDeleteResponse,
} from '../types/slides';
import type { JobCreateResponse } from '../types/jobs';
import { toNumber } from '../utils/numberUtils';
import { apiCall, API_BASE_URL } from './apiClient';

// Startet die asynchrone Generierung von Folien.
export async function generateSlides(
  request: SlidesGenerateRequest
): Promise<JobCreateResponse> {
  const payload = {
    topic: request.topic,
    language: request.language,
    slide_count: toNumber(request.slideCount),
    ...(request.contextText && { context_text: request.contextText }),
    ...(request.uploadContext && { upload_context: request.uploadContext }),
    ...(request.customPrompts && { custom_prompts: request.customPrompts }),
  };

  // Das Backend startet die Generierung asynchron und gibt sofort job_id + status zurück.
  return await apiCall<JobCreateResponse>(
    `${API_BASE_URL}/api/slides/generate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );
}

// Schließt eine Foliensitzung ab und speichert das Deck permanent.
export async function finalizeSlides(
  request: FinalizeSlidesRequest
): Promise<FinalizeSlidesResponse> {
  return await apiCall<FinalizeSlidesResponse>(
    `${API_BASE_URL}/api/slides/finalize`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    }
  );
}

// Listet alle gespeicherten Folien-Decks aus dem Archiv auf.
export async function listDecks(): Promise<DeckListResponse> {
  return await apiCall<DeckListResponse>(
    `${API_BASE_URL}/api/slides/archive`,
    {
      method: 'GET',
    }
  );
}

// Lädt die Details eines bestimmten Folien-Decks.
export async function getDeck(deckId: string): Promise<DeckDetailResponse> {
  return await apiCall<DeckDetailResponse>(
    `${API_BASE_URL}/api/slides/archive/${deckId}`,
    {
      method: 'GET',
    }
  );
}

// Aktualisiert die Folien eines bestehenden Decks im Archiv.
export async function updateDeck(deckId: string, slides: SlideDraft[]): Promise<DeckDetailResponse> {
  return await apiCall<DeckDetailResponse>(
    `${API_BASE_URL}/api/slides/archive/${deckId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ slides }),
    }
  );
}

// Löscht ein komplettes Folien-Deck aus dem Archiv.
export async function deleteDeck(deckId: string): Promise<DeckDeleteResponse> {
  return await apiCall<DeckDeleteResponse>(
    `${API_BASE_URL}/api/slides/archive/${deckId}`,
    {
      method: 'DELETE',
    }
  );
}
