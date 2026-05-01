// src/pages/SlidesGeneratePage.tsx
// Seite für die Folien-Generierung. Formular bleibt sichtbar, Vorschau öffnet sich im Modal.

import React, { useState } from 'react';
import { SlidesGenerateForm, SlidesPreview, SlidesSaveDialog } from '../../components/slides';
import { ErrorBanner, Modal, GenerationSkeleton } from '../../components/shared';
import { useSlidesGenerateForm } from '../../hooks/slides/useSlidesGenerateForm';
import type { SlidesGenerateResponse } from '../../types/slides';

export const SlidesGeneratePage: React.FC = () => {
  const [generationResponse, setGenerationResponse] = useState<SlidesGenerateResponse | null>(null);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Nach erfolgreichem Submit: Vorschau-Modal anzeigen.
  function handleGenerationSuccess(response: SlidesGenerateResponse): void {
    setGenerationResponse(response);
    setIsEditing(false); // Reset editing state on new generation
  }

  const form = useSlidesGenerateForm({ onSuccess: handleGenerationSuccess });

  // Schließt das Vorschau-Modal und kehrt zum Formular zurück.
  function handleDismissPreview(): void {
    setGenerationResponse(null);
    setIsEditing(false);
  }

  // Modal ist geöffnet, sobald eine Generierungsantwort vorliegt ODER geladen wird.
  const isPreviewOpen = generationResponse !== null || form.isSubmitting;

  function handleSlideChange(index: number, updatedSlide: import('../../types/slides').SlideDraft): void {
    if (!generationResponse) return;
    const newSlides = [...generationResponse.slides];
    newSlides[index] = updatedSlide;
    setGenerationResponse({ ...generationResponse, slides: newSlides });
  }

  return (
    <div className="page">
      <h1 className="page-title">Folien generieren</h1>
      <p className="page-description">
        Geben Sie Thema, Sprache und Folienanzahl an. Optional können Sie zusätzlich einen Kontexttext
        oder eine PDF-Datei hinterlegen, die bei der Foliengenerierung berücksichtigt werden.
      </p>

      <div className="page-form">
        <SlidesGenerateForm form={form} />
      </div>

      {/* Vorschau-Modal – erscheint nach erfolgreicher Generierung oder währenddessen */}
      <Modal
        isOpen={isPreviewOpen}
        title="Generierte Folien"
        onClose={handleDismissPreview}
        size="large"
        labelledById="slides-preview-title"
      >
        {form.isSubmitting && !generationResponse ? (
          <GenerationSkeleton
            count={1}
            message="KI generiert Präsentationsfolien …"
          />
        ) : generationResponse ? (
          <>
            <SlidesPreview 
              slides={generationResponse.slides} 
              isEditing={isEditing} 
              onSlideChange={handleSlideChange} 
            />

            <div className="slides-preview__meta">
              {form.isSaved && (
                <div
                  className="success-banner success-banner--modal"
                  role="alert"
                >
                  <strong>Erfolg!</strong> Die Folien wurden dauerhaft gespeichert.
                </div>
              )}

              <div className="slides-preview__actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={form.regenerate}
                  disabled={form.isSubmitting}
                  aria-busy={form.isSubmitting}
                  style={{ marginRight: 'auto' }}
                >
                  {form.isSubmitting ? (
                    <span className="form-submit-button__loading">
                      <span className="form-button-spinner" aria-hidden="true" />
                      Neu generieren …
                    </span>
                  ) : (
                    'Neu generieren'
                  )}
                </button>

                {!form.isSaved && (
                  <>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setIsEditing(!isEditing)}
                      disabled={form.isSubmitting}
                    >
                      {isEditing ? 'Bearbeitungsmodus beenden' : 'Folien bearbeiten'}
                    </button>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => setIsSaveDialogOpen(true)}
                      disabled={form.isSubmitting}
                    >
                      Speichern
                    </button>
                  </>
                )}
              </div>
            </div>

            <ErrorBanner message={form.submitError} />
          </>
        ) : null}
      </Modal>

      {/* Speichern-Dialog – wird aus dem Vorschau-Modal heraus geöffnet */}
      <SlidesSaveDialog
        isOpen={isSaveDialogOpen}
        onClose={() => setIsSaveDialogOpen(false)}
        onSave={async (name) => {
          await form.saveSlides(name);
          setIsSaveDialogOpen(false);
        }}
        defaultTopic={form.formValues.topic}
        isSaving={form.isSaving}
      />
    </div>
  );
};
