import { useState, useEffect, useRef } from 'react';
import type { GeneratedQuestion } from '../../types/generatedQuestion';
import type { GenerateRequestFormValues } from '../../types/generate';
import { generateQuestions, finalizeQuestions } from '../../services/questionsApi';
import { calculateQuestionDiff } from '../../utils/questionUtils';
import { getUserFriendlyMessage } from '../../error-handling/errorMappers';
import { DEFAULT_ERROR_MESSAGES, SUCCESS_MESSAGE_DISPLAY_TIME } from '../../constants/appConstants';

// Verwaltet den Daten-Workflow: Fragen generieren, bearbeiten, finalisieren.
// UI-spezifischer Modal-State liegt bewusst NICHT mehr hier, sondern auf der Page.
export function useQuestionWorkflow() {
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  // Original-Fragen für Diff-Berechnung (nur Änderungen senden)
  const [originalQuestions, setOriginalQuestions] = useState<GeneratedQuestion[]>([]);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Ref für setTimeout cleanup
  const timeoutRef = useRef<number | null>(null);
  // Verhindert doppelte Finalize-Requests bei schnellen Mehrfach-Events
  const isFinalizingRef = useRef(false);

  // Sendet Formular ans Backend; bei Erfolg landen die Fragen im State.
  const handleFormSubmit = async (values: GenerateRequestFormValues) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await generateQuestions(values);
      if (!result.questions || result.questions.length === 0) {
        throw new Error('Keine Fragen wurden generiert.');
      }
      if (result.questions.some(q => !q.id)) {
        throw new Error('Ungültige Fragen-Response: Fehlende IDs');
      }
      setQuestions(result.questions);
      setOriginalQuestions(result.questions);
      setRequestId(result.requestId);
    } catch (error) {
      console.error('Fehler beim Generieren der Fragen:', error);
      setErrorMessage(getUserFriendlyMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  // Verwirft den aktuellen Generierungs-Output und räumt Statusmeldungen auf.
  // Die Page leitet daraus ab, dass das Modal geschlossen werden muss.
  const dismissResults = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setQuestions([]);
    setOriginalQuestions([]);
    setRequestId(null);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

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
    if (isFinalizingRef.current || successMessage) {
      return;
    }

    if (!requestId) {
      setErrorMessage(DEFAULT_ERROR_MESSAGES.NO_REQUEST_ID);
      return;
    }

    if (questions.length === 0) {
      setErrorMessage(DEFAULT_ERROR_MESSAGES.NO_QUESTIONS);
      return;
    }

    isFinalizingRef.current = true;
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const finalizeQuestionsArray = calculateQuestionDiff(questions, originalQuestions);

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
      // Bereits finalisierte Anfrage sofort invalidieren, um 2. Submit zu verhindern
      setRequestId(null);

      // Nach 2 Sekunden Daten zurücksetzen. Die Page erkennt das leere `questions`-Array
      // und schließt das Modal automatisch.
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setQuestions([]);
        setOriginalQuestions([]);
        setRequestId(null);
        setSuccessMessage(null);
        timeoutRef.current = null;
      }, SUCCESS_MESSAGE_DISPLAY_TIME);
    } catch (error) {
      console.error('Fehler beim Finalisieren der Fragen:', error);
      setErrorMessage(getUserFriendlyMessage(error));
    } finally {
      isFinalizingRef.current = false;
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
    questions,
    originalQuestions,
    requestId,
    errorMessage,
    successMessage,
    isLoading,
    handleFormSubmit,
    dismissResults,
    handleQuestionChange,
    handleFinalizeQuestions,
  };
}

