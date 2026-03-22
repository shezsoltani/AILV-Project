// src/pages/GeneratePage.tsx
// Formular, dann Modal mit generierten Fragen, dann Finalisieren fürs Archiv.

import React from 'react';
import { GenerateForm } from '../components/GenerateForm';
import { QuestionsList } from '../components/QuestionsList';
import { ErrorBanner } from '../components/ErrorBanner';
import { useQuestionWorkflow } from '../hooks/useQuestionWorkflow';

const GeneratePage: React.FC = () => {
  // State und Aktionen für Generierung, Modal und Finalize.
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

  // Rendern der Seite
  return (
    <div className="page">
      <h1 className="page-title">Fragen generieren</h1>
      <p className="page-description">
        Hier können Sie das Eingabeformular für die Generierung von Prüfungsfragen verwenden.
        Geben Sie Ihre Anforderungen ein und lassen Sie die KI passende Fragen erstellen.
      </p>

      {/* Hauptformular */}
      <div className="page-form">
        <GenerateForm
          onSubmit={handleFormSubmit}
          isLoading={isLoading}
          submitError={!isModalOpen ? errorMessage : null}
        />
      </div>

      {/* Modal öffnet sich, sobald Fragen generiert wurden */}
      {isModalOpen && (
        <div className="questions-modal-overlay" role="dialog" aria-modal="true">
          <div className="questions-modal">
            <div className="questions-modal-header">
              <h2>Generierte Fragen</h2>
              <button
                type="button"
                className="questions-modal-close"
                aria-label="Modal schließen"
                onClick={handleCloseModal}
              >
                &times;
              </button>
            </div>

            <ErrorBanner message={errorMessage} style={{ margin: '1rem' }} />

            {/* Liste aller generierten Fragen - hier können sie bearbeitet werden */}
            <QuestionsList
              questions={questions}
              onQuestionChange={handleQuestionChange}
            />

            {/* Buttons zum Speichern oder Schließen */}
            <div className="questions-modal-actions">
              {successMessage && (
                <div
                  className="success-banner"
                  role="alert"
                  style={{
                    width: '100%',
                    marginBottom: '1rem',
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
              <button
                type="button"
                className="primary-button"
                onClick={handleFinalizeQuestions}
                disabled={isLoading}
              >
                {isLoading ? 'Wird gespeichert...' : 'Fragen speichern'}
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

