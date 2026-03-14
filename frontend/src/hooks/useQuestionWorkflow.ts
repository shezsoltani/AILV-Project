// src/hooks/useQuestionWorkflow.ts
import { useState, useEffect, useRef } from 'react';
import type { GeneratedQuestion } from '../types/generatedQuestion';
import type { GenerateRequestFormValues } from '../types/generate';
import { generateQuestions, finalizeQuestions } from '../services/api';
import { calculateQuestionDiff } from '../utils/questionUtils';
import { getUserFriendlyMessage } from '../utils/errorUtils';
import { DEFAULT_ERROR_MESSAGES, SUCCESS_MESSAGE_DISPLAY_TIME, ESCAPE_KEY } from '../constants/appConstants';

// Verwaltet Workflow: Fragen generieren, bearbeiten und finalisieren
export function useQuestionWorkflow() {
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  // Original-Fragen für Diff-Berechnung (nur Änderungen senden)
  const [originalQuestions, setOriginalQuestions] = useState<GeneratedQuestion[]>([]);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Ref für setTimeout cleanup
  const timeoutRef = useRef<number | null>(null);

  // Sendet Formular ans Backend und öffnet Modal mit generierten Fragen
  const handleFormSubmit = async (values: GenerateRequestFormValues) => {
    setIsLoading(true);
    setErrorMessage(null); 

    try {
      const result = await generateQuestions(values);
      // Prüfen, ob Fragen vorhanden sind und alle eine gültige ID haben
      if (!result.questions || result.questions.length === 0) {
        throw new Error('Keine Fragen wurden generiert.');
      }
      if (result.questions.some(q => !q.id)) {
        throw new Error('Ungültige Fragen-Response: Fehlende IDs');
      }
      // Original-Fragen speichern für spätere Diff-Berechnung
      setQuestions(result.questions);
      setOriginalQuestions(result.questions);
      setRequestId(result.requestId);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Fehler beim Generieren der Fragen:', error);
      // Verwende getUserFriendlyMessage für bessere Fehlermeldungen
      setErrorMessage(getUserFriendlyMessage(error));
      setIsModalOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    // Timeout löschen, falls noch aktiv
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsModalOpen(false);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // ESC-Taste schließt das Modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === ESCAPE_KEY && isModalOpen) {
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

  // Aktualisiert einzelne Frage im Array (findet per ID)
  const handleQuestionChange = (updatedQuestion: GeneratedQuestion) => {
    setQuestions((prevQuestions) =>
      prevQuestions.map((q) =>
        q.id === updatedQuestion.id ? updatedQuestion : q
      )
    );
  };

  // Sendet nur Änderungen ans Backend und finalisiert Fragen
  const handleFinalizeQuestions = async () => {
    if (!requestId) {
      setErrorMessage(DEFAULT_ERROR_MESSAGES.NO_REQUEST_ID);
      return;
    }

    if (questions.length === 0) {
      setErrorMessage(DEFAULT_ERROR_MESSAGES.NO_QUESTIONS);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Nur Änderungen senden (optimiert Datenübertragung)
      const finalizeQuestionsArray = calculateQuestionDiff(questions, originalQuestions);
      
      // Prüfen, ob es Änderungen gibt
      if (finalizeQuestionsArray.length === 0) {
        setErrorMessage('Keine Änderungen wurden vorgenommen.');
        setIsLoading(false);
        return;
      }

      const response = await finalizeQuestions({
        request_id: requestId,
        questions: finalizeQuestionsArray,
      });

      setErrorMessage(null);
      const count = response.finalized_count;
      setSuccessMessage(`${count} ${count === 1 ? 'Frage' : 'Fragen'} gespeichert. Sie finden sie im Archiv.`);
      
      // Nach 2 Sekunden zurücksetzen (Erfolgsmeldung bleibt sichtbar)
      // Alten Timeout löschen, falls vorhanden
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setQuestions([]);
        setOriginalQuestions([]);
        setRequestId(null);
        setSuccessMessage(null);
        setIsModalOpen(false);
        timeoutRef.current = null;
      }, SUCCESS_MESSAGE_DISPLAY_TIME);
    } catch (error) {
      console.error('Fehler beim Finalisieren der Fragen:', error);
      // Verwende getUserFriendlyMessage für bessere Fehlermeldungen
      setErrorMessage(getUserFriendlyMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup: Timeout löschen beim Unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

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

