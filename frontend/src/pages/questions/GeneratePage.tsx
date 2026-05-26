import React, { useEffect, useState } from 'react';
import { GenerateForm, QuestionsList, QuestionsStats } from '../../components/generate';
import { ErrorBanner, Modal, GenerationSkeleton, PromptEditorModal } from '../../components/shared';
import { useQuestionWorkflow } from '../../hooks/questions/useQuestionWorkflow';
import { useGenerateForm } from '../../hooks/questions/useGenerateForm';
import { useJobContext } from '../../context/JobContext';
import { getPromptPreview, toQuestionsPromptPreviewRequest } from '../../services/promptsApi';
import { getUserFriendlyMessage } from '../../error-handling/errorMappers';
import type { RenderedPrompt } from '../../types/prompts';

export const GeneratePage: React.FC = () => {
  const {
    questions,
    jobId,
    jobStatus,
    jobProgress,
    jobStageLabel,
    errorMessage,
    successMessage,
    isLoading,
    handleFormSubmit,
    handleQuestionChange,
    handleFinalizeQuestions,
    cancelGeneration,
  } = useQuestionWorkflow();

  const generateForm = useGenerateForm({
    onSubmit: handleFormSubmit,
    isLoading,
  });

  const { activeJob, addJob } = useJobContext();

  const [isModalHidden, setIsModalHidden] = useState(false);
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [previewPrompts, setPreviewPrompts] = useState<RenderedPrompt[] | null>(null);
  const [, setAppliedPromptTexts] = useState<Record<string, string> | null>(null);
  const [promptPreviewLoading, setPromptPreviewLoading] = useState(false);
  const [promptPreviewError, setPromptPreviewError] = useState<string | null>(null);

  const hasQuestions = questions.length > 0;
  const isGenerating = jobStatus === 'pending' || jobStatus === 'running';
  const isTopicEmpty = !generateForm.formValues.topic.trim();

  // Neuen jobId im globalen Context registrieren → löst Polling und Statusleiste aus.
  useEffect(
    function registerJobInContext() {
      if (jobId !== null) {
        addJob(jobId, 'generate_questions');
      }
    },
    [jobId] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(
    function reopenModalWhenQuestionsArrive() {
      if (hasQuestions || isGenerating) {
        setIsModalHidden(false);
      }
    },
    [hasQuestions, isGenerating]
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

  // Modal kann geschlossen werden, während der Job im Hintergrund weiterläuft.
  const isModalOpen =
    (jobId !== null || hasQuestions) &&
    !isModalHidden;

  // Zeigt Skeleton nur, solange der Job wirklich laeuft und noch keine Fragen da sind.
  const showSkeleton = Boolean(jobId) && isGenerating && !hasQuestions;

  function handleModalClose(): void {
    setIsModalHidden(true);
  }

  function handlePromptModalClose(): void {
    setPromptModalOpen(false);
  }

  function handlePromptSave(editedPrompts: Record<string, string>): void {
    setAppliedPromptTexts(editedPrompts);
  }

  async function handleViewPrompts(): Promise<void> {
    setPromptPreviewLoading(true);
    setPromptPreviewError(null);

    try {
      const response = await getPromptPreview(
        toQuestionsPromptPreviewRequest(generateForm.formValues)
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

  return (
    <div className="page">
      <h1 className="page-title">Fragen generieren</h1>
      <p className="page-description">
        Hier können Sie das Eingabeformular für die Generierung von Prüfungsfragen verwenden.
        Geben Sie Ihre Anforderungen ein und lassen Sie die KI passende Fragen erstellen.
      </p>

      <div className="page-form">
        <GenerateForm
          form={generateForm}
          submitError={!isModalOpen ? errorMessage : null}
        />

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

      <Modal isOpen={isModalOpen} title="Generierte Fragen" onClose={handleModalClose}>
        {showSkeleton ? (
          <>
            <GenerationSkeleton
              count={3}
              message={activeJob?.stageLabel ?? 'Generierung läuft …'}
              progress={jobProgress ?? undefined}
              stageLabel={jobStageLabel}
            />
            <div className="questions-modal-actions">
              <button
                type="button"
                className="primary-button danger-button"
                onClick={cancelGeneration}
              >
                Generierung abbrechen
              </button>
            </div>
          </>
        ) : (
          <>
            <ErrorBanner message={errorMessage} />

            <QuestionsStats questions={questions} />

            <QuestionsList
              questions={questions}
              onQuestionChange={handleQuestionChange}
            />

            <div className="questions-modal-actions">
              {successMessage && (
                <div
                  className="success-banner success-banner--modal"
                  role="alert"
                >
                  <strong>Erfolg:</strong> {successMessage}
                </div>
              )}
              <button
                type="button"
                className="primary-button"
                onClick={handleFinalizeQuestions}
                disabled={isLoading || Boolean(successMessage)}
              >
                {isLoading ? 'Wird gespeichert...' : 'Fragen speichern'}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={handleModalClose}
                disabled={isLoading}
              >
                Schließen
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};
