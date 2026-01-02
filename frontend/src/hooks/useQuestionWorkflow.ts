import { useState, useEffect } from 'react';
import type { GeneratedQuestion } from '../types/generatedQuestion';
import type { GenerateRequestFormValues } from '../types/generate';
import { generateQuestions, finalizeQuestions } from '../services/api';
import { calculateQuestionDiff } from '../utils/questionUtils';

// Verwaltet den kompletten Workflow: Fragen generieren, bearbeiten und finalisieren
export function useQuestionWorkflow() {
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
      // Originale Fragen speichern, um später Änderungen zu erkennen
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

  // ESC-Taste schließt das Modal
  useEffect(() => {
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
      // Nur die Änderungen an die API senden
      const finalizeQuestionsArray = calculateQuestionDiff(questions, originalQuestions);
      const response = await finalizeQuestions({
        request_id: requestId,
        questions: finalizeQuestionsArray,
      });

      // Erfolg: Zeige Erfolgsmeldung und setze States zurück
      setErrorMessage(null);
      setSuccessMessage(
        `${response.message} (${response.finalized_count} Fragen finalisiert)`
      );
      
      // Nach 2 Sekunden alles zurücksetzen, damit die Erfolgsmeldung sichtbar bleibt
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

  return {
    // States
    questions,
    originalQuestions,
    requestId,
    isModalOpen,
    errorMessage,
    successMessage,
    isLoading,
    // Handlers
    handleFormSubmit,
    handleCloseModal,
    handleQuestionChange,
    handleFinalizeQuestions,
  };
}

