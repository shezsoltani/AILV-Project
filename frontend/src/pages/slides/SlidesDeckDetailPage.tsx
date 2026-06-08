import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type { SlideDraft } from '../../types/slides';
import { SlidesPreview } from '../../components/slides/SlidesPreview';
import { ErrorBanner, ConfirmDialog, Modal, SlidesExportDropdownButton } from '../../components/shared';
import { formatDateToGerman } from '../../utils/dateUtils';
import { useDeckDetail } from '../../hooks/slides/useDeckDetail';

export const SlidesDeckDetailPage: React.FC = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const [isPreviewOpen] = useState(true);
  const [editedSlides, setEditedSlides] = useState<SlideDraft[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  const {
    deck,
    isLoading,
    error,
    isDeleteDialogOpen,
    isDeleting,
    isUpdating,
    updateSuccess,
    setIsDeleteDialogOpen,
    handleDeleteConfirm,
    handleUpdateDeck,
    handleBack,
  } = useDeckDetail(deckId);

  // Initialisiere die lokalen Bearbeitungs-Folien, wenn das Deck geladen wurde
  useEffect(() => {
    if (deck && deck.slides) {
      const drafts: SlideDraft[] = deck.slides.map((slide) => ({
        position: slide.position,
        slide_type: slide.slide_type || 'content',
        title: slide.title || '',
        bullets: slide.bullets || [],
        examples: slide.examples || [],
      }));
      setEditedSlides(drafts);
    }
  }, [deck]);

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

  const handleSlideChange = (index: number, updatedSlide: SlideDraft) => {
    const newSlides = [...editedSlides];
    newSlides[index] = updatedSlide;
    setEditedSlides(newSlides);
  };

  const handleSave = async () => {
    await handleUpdateDeck(editedSlides);
    setIsEditing(false);
  };

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

      {/* Folien-Vorschau im Modal */}
      <Modal
        isOpen={isPreviewOpen}
        title={deck.name}
        onClose={handleBack}
        size="large"
        labelledById="deck-preview-title"
      >
        <SlidesPreview
          slides={editedSlides}
          isEditing={isEditing}
          onSlideChange={handleSlideChange}
        />

        {updateSuccess && (
          <div className="success-banner success-banner--modal" style={{ marginBottom: '1rem' }}>
            Änderungen erfolgreich gespeichert!
          </div>
        )}

        <div className="questions-modal-actions">
          <button
            type="button"
            className="secondary-button archive-button-with-icon"
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={isDeleting || isUpdating}
            style={{ marginRight: 'auto' }}
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

          {isEditing ? (
            <button
              type="button"
              className="primary-button"
              onClick={handleSave}
              disabled={isUpdating}
            >
              {isUpdating ? 'Wird gespeichert...' : 'Änderungen speichern'}
            </button>
          ) : (
            <button
              type="button"
              className="primary-button"
              onClick={() => setIsEditing(true)}
              disabled={isUpdating}
            >
              Folien bearbeiten
            </button>
          )}

          <SlidesExportDropdownButton
            jobId={deckId ?? ''}
            mode="archive"
            disabled={isDeleting || isUpdating}
          />

          <button
            type="button"
            className="secondary-button"
            onClick={handleBack}
            disabled={isUpdating}
          >
            Schließen
          </button>
        </div>
      </Modal>

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
