import React, { useEffect, useState } from 'react';
import { GenerateForm, QuestionsList, QuestionsStats } from '../../components/generate';
import { ErrorBanner, Modal, GenerationSkeleton } from '../../components/shared';
import { useQuestionWorkflow } from '../../hooks/questions/useQuestionWorkflow';
import { useJobContext } from '../../context/JobContext';

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

  const { activeJob, addJob } = useJobContext();

  const [isModalHidden, setIsModalHidden] = useState(false);
  const hasQuestions = questions.length > 0;
  const isGenerating = jobStatus === 'pending' || jobStatus === 'running';

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

  return (
    <div className="page">
      <h1 className="page-title">Fragen generieren</h1>
      <p className="page-description">
        Hier können Sie das Eingabeformular für die Generierung von Prüfungsfragen verwenden.
        Geben Sie Ihre Anforderungen ein und lassen Sie die KI passende Fragen erstellen.
      </p>

      <div className="page-form">
        <GenerateForm
          onSubmit={handleFormSubmit}
          isLoading={isLoading}
          submitError={!isModalOpen ? errorMessage : null}
        />
      </div>

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
