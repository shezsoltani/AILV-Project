import type { Language } from './generate';

export interface SlidesGenerateRequest {
  topic: string;
  language: Language;
  slideCount: number | '';
  contextText?: string;
  uploadContext?: string;
}

export interface SlidesGenerateResponse {
  status: string;
  request_id: string;
  slides: SlideDraft[];
}

export interface SlideDraft {
  position: number;
  slide_type: string;
  title: string;
  bullets: string[];
  examples: string[];
}

export interface FinalizeSlidesRequest {
  request_id: string;
  name: string;
}

export interface FinalizeSlidesResponse {
  deck_id: string;
  saved_slides_count: number;
}

export interface DeckSlideItem {
  id: string;
  position: number;
  slide_type: string | null;
  title: string | null;
  bullets: string[];
  examples: string[];
  created_at: string | null;
}

export interface DeckListItem {
  id: string;
  request_id: string | null;
  name: string;
  created_at: string | null;
  slide_count: number;
}

export interface DeckListResponse {
  decks: DeckListItem[];
}

export interface DeckDetailResponse {
  id: string;
  request_id: string | null;
  name: string;
  created_at: string | null;
  slides: DeckSlideItem[];
}

export interface DeckDeleteResponse {
  success: boolean;
  deck_id: string;
  message: string;
}