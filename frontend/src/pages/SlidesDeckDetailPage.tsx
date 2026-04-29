import React from 'react';
import { useParams } from 'react-router-dom';
import type { SlideDraft } from '../types/slides';
import { SlidesPreview } from '../components/slides/SlidesPreview';
import { ErrorBanner, ConfirmDialog } from '../components/shared';
import { formatDateToGerman } from '../utils/dateUtils';
import { useDeckDetail } from '../hooks/useDeckDetail';

export const SlidesDeckDetailPage: React.FC = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const {
    deck,
    isLoading,
    error,
    isDeleteDialogOpen,
    isDeleting,
    setIsDeleteDialogOpen,
    handleDeleteConfirm,
    handleBack,
  } = useDeckDetail(deckId);

  if (isLoading) {
    return (
      <div className="page">
        <div className="archive-loading-state">
          <div className="archive-loading-spinner" aria-hidden="true"></div>
          <p>Foliendeck wird geladen...</p>
        </div>
      </div>
    );
  }

  if (error && !deck) {
    return (
      <div className="page">
        <div className="archive-back-button">
          <button type="button" className="secondary-button" onClick={handleBack}>
            <svg
              className="archive-back-icon"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Zurück zum Archiv
          </button>
        </div>
        <ErrorBanner message={error} />
      </div>
    );
  }

  if (!deck) {
    return null;
  }

  // Mappe die API-Daten auf das Format der Vorschau (SlideDraft)
  const slideDrafts: SlideDraft[] = deck.slides.map((slide) => ({
    position: slide.position,
    slide_type: slide.slide_type || 'content',
    title: slide.title || '',
    bullets: slide.bullets || [],
  }));

  return (
    <div className="page">
      <div className="archive-back-button">
        <button type="button" className="secondary-button" onClick={handleBack} disabled={isDeleting}>
          <svg
            className="archive-back-icon"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Zurück zum Archiv
        </button>
      </div>

      <h1 className="page-title">{deck.name}</h1>
      <p className="page-description">
        Erstellt am {deck.created_at ? formatDateToGerman(deck.created_at) : 'Unbekannt'} • {deck.slides.length} Folien
      </p>

      {error && <ErrorBanner message={error} />}

      <div className="archive-action-bar">
        <button
          type="button"
          className="secondary-button archive-button-with-icon"
          onClick={() => setIsDeleteDialogOpen(true)}
          disabled={isDeleting}
        >
          <svg
            className="archive-btn-icon"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Löschen
        </button>
      </div>

      <SlidesPreview slides={slideDrafts} />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Foliendeck löschen"
        description={`Möchten Sie das Foliendeck "${deck.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        confirmLabel={isDeleting ? 'Wird gelöscht...' : 'Endgültig löschen'}
        cancelLabel="Abbrechen"
        onConfirm={handleDeleteConfirm}
        onCancel={() => !isDeleting && setIsDeleteDialogOpen(false)}
        isLoading={isDeleting}
      />
    </div>
  );
};
