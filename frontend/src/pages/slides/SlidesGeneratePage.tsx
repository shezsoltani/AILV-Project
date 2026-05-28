// src/pages/SlidesGeneratePage.tsx
// Seite für die Folien-Generierung. Formular bleibt sichtbar, Vorschau öffnet sich im Modal.

import React, { useEffect, useState } from 'react';
import { SlidesGenerateForm, SlidesPreview, SlidesSaveDialog } from '../../components/slides';
import { ErrorBanner, Modal, GenerationSkeleton, PromptEditorModal } from '../../components/shared';
import { useSlidesGenerateForm } from '../../hooks/slides/useSlidesGenerateForm';
import { useJobContext } from '../../context/JobContext';
import { getPromptPreview, toSlidesPromptPreviewRequest } from '../../services/promptsApi';
import { getUserFriendlyMessage } from '../../error-handling/errorMappers';
import type { SlidesGenerateResponse } from '../../types/slides';
import type { RenderedPrompt } from '../../types/prompts';

export const SlidesGeneratePage: React.FC = () => {
  const [generationResponse, setGenerationResponse] = useState<SlidesGenerateResponse | null>(null);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Nach erfolgreichem Submit: Vorschau-Modal anzeigen.
  function handleGenerationSuccess(response: SlidesGenerateResponse): void {
    setGenerationResponse(response);
    setIsEditing(false); // Reset editing state on new generation
  }

  const [customPrompts, setCustomPrompts] = useState<Record<string, string> | undefined>(
    undefined
  );

  const form = useSlidesGenerateForm({
    onSuccess: handleGenerationSuccess,
    customPrompts,
  });
  const { activeJob } = useJobContext();
  const [isModalHidden, setIsModalHidden] = useState(false);
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [previewPrompts, setPreviewPrompts] = useState<RenderedPrompt[] | null>(null);
  const [promptPreviewLoading, setPromptPreviewLoading] = useState(false);
  const [promptPreviewError, setPromptPreviewError] = useState<string | null>(null);

  const isTopicEmpty = !form.formValues.topic.trim();

  // Custom Prompts verwerfen wenn sich Formularwerte ändern (sonst fest eingebackene slide_count/topic).
  useEffect(
    function clearCustomPromptsOnFormChange() {
      setCustomPrompts(undefined);
      setPreviewPrompts(null);
    },
    [form.formValues.slideCount, form.formValues.topic, form.formValues.language]
  );

  useEffect(
    function reopenPreviewWhenResultArrives() {
      if (generationResponse) {
        setIsModalHidden(false);
      }
    },
    [generationResponse]
  );

  useEffect(function listenForOpenModalEvent() {
    function handleOpenModal(): void {
      setIsModalHidden(false);
    }

    window.addEventListener('open-active-job-modal', handleOpenModal);
    return function cleanupOpenModalEvent() {
      window.removeEventListener('open-active-job-modal', handleOpenModal);
    };
  }, []);

  function handlePreviewClose(): void {
    setIsModalHidden(true);
  }

  function handlePromptModalClose(): void {
    setPromptModalOpen(false);
  }

  function handlePromptSave(editedPrompts: Record<string, string>): void {
    setCustomPrompts(editedPrompts);
  }

  async function handleViewPrompts(): Promise<void> {
    setPromptPreviewLoading(true);
    setPromptPreviewError(null);

    try {
      const response = await getPromptPreview(
        toSlidesPromptPreviewRequest(form.formValues)
      );
      setPreviewPrompts(response.prompts);
      setPromptModalOpen(true);
    } catch (error) {
      console.error('Fehler beim Laden der Prompt-Vorschau:', error);
      setPromptPreviewError(getUserFriendlyMessage(error));
    } finally {
      setPromptPreviewLoading(false);
    }
  }

  const isPreviewOpen =
    (form.jobId !== null || generationResponse !== null) &&
    !isModalHidden;

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

        <button
          type="button"
          className="secondary-button"
          onClick={handleViewPrompts}
          disabled={isTopicEmpty || promptPreviewLoading}
          aria-busy={promptPreviewLoading}
        >
          {promptPreviewLoading ? (
            <span className="form-submit-button__loading">
              <span className="form-button-spinner" aria-hidden="true" />
              Prompts werden geladen …
            </span>
          ) : (
            'Prompts ansehen'
          )}
        </button>

        <ErrorBanner message={promptPreviewError} />
      </div>

      {previewPrompts !== null && (
        <PromptEditorModal
          prompts={previewPrompts}
          isOpen={promptModalOpen}
          onClose={handlePromptModalClose}
          onSave={handlePromptSave}
        />
      )}

      {/* Vorschau-Modal – erscheint nach erfolgreicher Generierung oder währenddessen */}
      <Modal
        isOpen={isPreviewOpen}
        title="Generierte Folien"
        onClose={handlePreviewClose}
        size="large"
        labelledById="slides-preview-title"
      >
        {form.jobId !== null && !generationResponse ? (
          <>
            <GenerationSkeleton
              count={1}
              message={activeJob?.stageLabel ?? 'Generierung läuft …'}
              progress={form.jobProgress ?? undefined}
              stageLabel={form.jobStageLabel}
            />
            <div className="slides-preview__actions">
              <button
                type="button"
                className="primary-button danger-button"
                onClick={async () => {
                  await form.cancelGeneration();
                  setGenerationResponse(null);
                  setIsModalHidden(false);
                }}
              >
                Generierung abbrechen
              </button>
            </div>
          </>
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
