import React from 'react';
import { GenerateForm } from '../components/GenerateForm';
import { QuestionsList } from '../components/QuestionsList';
import { useQuestionWorkflow } from '../hooks/useQuestionWorkflow';

const GeneratePage: React.FC = () => {
  const {
    questions,
    isModalOpen,
    errorMessage,
    successMessage,
    isLoading,
    handleFormSubmit,
    handleCloseModal,
    handleQuestionChange,
    handleFinalizeQuestions,
  } = useQuestionWorkflow();

  return (
    <div className="page">
      <h1 className="page-title">Fragen generieren</h1>
      <p className="page-description">
        Hier können Sie das Eingabeformular für die Generierung von Prüfungsfragen verwenden.
        Geben Sie Ihre Anforderungen ein und lassen Sie die KI passende Fragen erstellen.
      </p>
      {/* Fehlerbanner sichtbar über dem Formular (nur wenn Modal nicht offen) */}
      {errorMessage && !isModalOpen && (
        <div className="error-banner" role="alert">
          <div className="error-banner-content">
            <strong>Fehler:</strong> {errorMessage}
          </div>
        </div>
      )}
      <div className="page-form">
        <GenerateForm onSubmit={handleFormSubmit} isLoading={isLoading} />
      </div>

      
      {isModalOpen && (
        <div className="questions-modal-overlay" role="dialog" aria-modal="true">
          <div className="questions-modal">
            <div className="questions-modal-header">
              <h2>Generierte Fragen-Struktur</h2>
              <button
                type="button"
                className="questions-modal-close"
                aria-label="Modal schließen"
                onClick={handleCloseModal}
              >
                &times;
              </button>
            </div>

            {errorMessage && (
              <div className="error-banner" role="alert" style={{ margin: '1rem' }}>
                <div className="error-banner-content">
                  <strong>Fehler:</strong> {errorMessage}
                </div>
              </div>
            )}
            {successMessage && (
              <div
                className="success-banner"
                role="alert"
                style={{
                  margin: '1rem',
                  padding: '1rem',
                  backgroundColor: '#d4edda',
                  color: '#155724',
                  borderRadius: '4px',
                  border: '1px solid #c3e6cb',
                }}
              >
                <strong>Erfolg:</strong> {successMessage}
              </div>
            )}

            <QuestionsList
              questions={questions}
              onQuestionChange={handleQuestionChange}
              onFinalize={handleFinalizeQuestions}
            />

            <div className="questions-modal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={handleFinalizeQuestions}
                disabled={isLoading}
              >
                {isLoading ? 'Wird gespeichert...' : 'Fragen speichern & finalisieren'}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={handleCloseModal}
                disabled={isLoading}
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneratePage;

