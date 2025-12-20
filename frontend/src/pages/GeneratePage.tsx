import React, { useState } from 'react';
import { GenerateForm } from '../components/GenerateForm';
import { QuestionsList } from '../components/QuestionsList';
import type { GeneratedQuestion } from '../types/generatedQuestion';
import { generateQuestions } from '../services/api';
import type { GenerateRequestFormValues } from '../types/generate';

const GeneratePage: React.FC = () => {
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFormSubmit = async (values: GenerateRequestFormValues) => {
    console.log('handleFormSubmit wurde aufgerufen mit:', values);
    setIsLoading(true);
    setErrorMessage(null);
    //setIsModalOpen(false); 

    try {
      const result = await generateQuestions(values);
      setQuestions(result);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Fehler beim Generieren der Fragen:', error);
      let errorText = 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
      
      if (error instanceof Error) {
        errorText = error.message;
      } else if (typeof error === 'string') {
        errorText = error;
      }
      
      setErrorMessage(errorText);
      // Modal darf nicht geöffnet werden, wenn ein Fehler vorliegt
      setIsModalOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="page">
      <h1 className="page-title">Fragen generieren</h1>
      <p className="page-description">
        Hier können Sie das Eingabeformular für die Generierung von Prüfungsfragen verwenden.
        Geben Sie Ihre Anforderungen ein und lassen Sie die KI passende Fragen erstellen.
      </p>
      {/* Fehlerbanner sichtbar über dem Formular */}
      {errorMessage && (
        <div className="error-banner" role="alert">
          <div className="error-banner-content">
            <strong>Fehler:</strong> {errorMessage}
          </div>
        </div>
      )}
      <div className="page-form">
        <GenerateForm onSubmit={handleFormSubmit} isLoading={isLoading} />
      </div>

      
      {isModalOpen && !errorMessage && (
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

            <QuestionsList questions={questions} />

            <div className="questions-modal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={handleCloseModal}
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

