// src/pages/SlidesGeneratePage.tsx
// Seite für die Folien-Generierung. Formular bleibt sichtbar, Vorschau öffnet sich im Modal.

import React, { useState } from 'react';
import { SlidesGenerateForm, SlidesPreview, SlidesSaveDialog } from '../../components/slides';
import { ErrorBanner, Modal } from '../../components/shared';
import { useSlidesGenerateForm } from '../../hooks/slides/useSlidesGenerateForm';
import type { SlidesGenerateResponse } from '../../types/slides';

export const SlidesGeneratePage: React.FC = () => {
  const [generationResponse, setGenerationResponse] = useState<SlidesGenerateResponse | null>(null);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

  // Nach erfolgreichem Submit: Vorschau-Modal anzeigen.
  function handleGenerationSuccess(response: SlidesGenerateResponse): void {
    setGenerationResponse(response);
  }

  const form = useSlidesGenerateForm({ onSuccess: handleGenerationSuccess });

  // Schließt das Vorschau-Modal und kehrt zum Formular zurück.
  function handleDismissPreview(): void {
    setGenerationResponse(null);
  }

  // Modal ist geöffnet, sobald eine Generierungsantwort vorliegt.
  const isPreviewOpen = generationResponse !== null;

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

      {/* Vorschau-Modal – erscheint nach erfolgreicher Generierung */}
      <Modal
        isOpen={isPreviewOpen}
        title="Generierte Folien"
        onClose={handleDismissPreview}
        size="large"
        labelledById="slides-preview-title"
      >
        {generationResponse && (
          <>
            <SlidesPreview slides={generationResponse.slides} />

            <div className="slides-preview__meta">
              <p className="form-helper slides-preview__request-id">
                Request-ID: <code>{generationResponse.request_id}</code>
              </p>

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
                  onClick={handleDismissPreview}
                  disabled={form.isSubmitting}
                >
                  Eingaben ändern
                </button>

                <button
                  type="button"
                  className="primary-button"
                  onClick={form.regenerate}
                  disabled={form.isSubmitting}
                  aria-busy={form.isSubmitting}
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
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => setIsSaveDialogOpen(true)}
                    disabled={form.isSubmitting}
                  >
                    Speichern
                  </button>
                )}
              </div>
            </div>

            <ErrorBanner message={form.submitError} />
          </>
        )}
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
