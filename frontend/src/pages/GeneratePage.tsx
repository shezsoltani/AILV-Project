import React, { useState } from 'react';
import { GenerateForm } from '../components/GenerateForm';
import { QuestionsList } from '../components/QuestionsList';
import type { GeneratedQuestion } from '../types/generatedQuestion';
import { generateQuestions, finalizeQuestions, type FinalQuestion } from '../services/api';
import type { GenerateRequestFormValues } from '../types/generate';

const GeneratePage: React.FC = () => {
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [originalQuestions, setOriginalQuestions] = useState<GeneratedQuestion[]>([]);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFormSubmit = async (values: GenerateRequestFormValues) => {
    setIsLoading(true);
    setErrorMessage(null); 

    try {
      const result = await generateQuestions(values);
      setQuestions(result.questions);
      setOriginalQuestions(result.questions);
      setRequestId(result.requestId);
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
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // ESC-Taste schließt Modal
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
        setErrorMessage(null);
        setSuccessMessage(null);
      }
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isModalOpen]);

  const handleQuestionChange = (updatedQuestion: GeneratedQuestion) => {
    setQuestions((prevQuestions) =>
      prevQuestions.map((q) =>
        q.id === updatedQuestion.id ? updatedQuestion : q
      )
    );
  };

  const handleFinalizeQuestions = async () => {
    if (!requestId) {
      setErrorMessage('Keine Request-ID vorhanden.');
      return;
    }

    if (questions.length === 0) {
      setErrorMessage('Keine Fragen zum Finalisieren vorhanden.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Erstelle Array für finalizeQuestions-API-Call
      const finalizeQuestionsArray: FinalQuestion[] = questions.map((q) => {
        // Finde das Original-Objekt
        const original = originalQuestions.find((oq) => oq.id === q.id);
        
        if (!original) {
          // Falls Original nicht gefunden, sende alle Felder
          const finalQuestion: FinalQuestion = {
            generated_question_id: q.id,
          };
          
          if (q.question) finalQuestion.stem = q.question;
          if (q.difficulty) finalQuestion.difficulty = q.difficulty;
          if (q.type) finalQuestion.type = q.type;
          if (q.choices) finalQuestion.choices = q.choices;
          if (q.correct_index !== undefined) finalQuestion.correct_index = q.correct_index;
          if (q.rationale) finalQuestion.rationale = q.rationale;
          
          return finalQuestion;
        }

        // Erstelle Objekt mit generated_question_id
        const finalQuestion: FinalQuestion = {
          generated_question_id: q.id,
        };

        // Vergleiche jedes Feld und füge nur geänderte Felder hinzu
        if (q.question !== original.question) {
          finalQuestion.stem = q.question; // Mapping: question → stem
        }
        if (q.difficulty !== original.difficulty) {
          finalQuestion.difficulty = q.difficulty;
        }
        if (q.type !== original.type) {
          finalQuestion.type = q.type;
        }
        
        // Vergleiche choices (Array-Vergleich)
        const choicesChanged = (() => {
          const current = q.choices || [];
          const orig = original.choices || [];
          if (current.length !== orig.length) return true;
          return current.some((val, idx) => val !== orig[idx]);
        })();
        if (choicesChanged && q.choices) {
          finalQuestion.choices = q.choices;
        }
        
        if (q.correct_index !== original.correct_index) {
          finalQuestion.correct_index = q.correct_index;
        }
        if (q.rationale !== original.rationale) {
          finalQuestion.rationale = q.rationale;
        }

        return finalQuestion;
      });

      // API-Call
      const response = await finalizeQuestions({
        request_id: requestId,
        questions: finalizeQuestionsArray,
      });

      // Erfolg: Zeige Erfolgsmeldung und setze States zurück
      setErrorMessage(null);
      setSuccessMessage(
        `${response.message} (${response.finalized_count} Fragen finalisiert)`
      );
      
      // States nach kurzer Verzögerung zurücksetzen, damit Erfolgsmeldung sichtbar ist
      setTimeout(() => {
        setQuestions([]);
        setOriginalQuestions([]);
        setRequestId(null);
        setSuccessMessage(null);
        setIsModalOpen(false);
      }, 2000);
    } catch (error) {
      console.error('Fehler beim Finalisieren der Fragen:', error);
      let errorText = 'Ein Fehler ist beim Finalisieren aufgetreten.';
      
      if (error instanceof Error) {
        errorText = error.message;
      } else if (typeof error === 'string') {
        errorText = error;
      }
      
      setErrorMessage(errorText);
    } finally {
      setIsLoading(false);
    }
  };

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

