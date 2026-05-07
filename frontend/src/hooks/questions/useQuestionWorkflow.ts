// src/hooks/questions/useQuestionWorkflow.ts
// Daten-Workflow für Fragen-Generierung; Modal-State liegt auf der Page, nicht hier.

import { useState, useEffect, useRef } from 'react';
import type { GeneratedQuestion } from '../../types/generatedQuestion';
import type { GenerateRequestFormValues } from '../../types/generate';
import { generateQuestions, finalizeQuestions } from '../../services/questionsApi';
import { cancelJob } from '../../services/jobsApi';
import { calculateQuestionDiff } from '../../utils/questionUtils';
import { getUserFriendlyMessage } from '../../error-handling/errorMappers';
import { DEFAULT_ERROR_MESSAGES, SUCCESS_MESSAGE_DISPLAY_TIME } from '../../constants/appConstants';
import { useJobContext } from '../../context/JobContext';

export function useQuestionWorkflow() {
  const { activeJob, addJob, dismissJob } = useJobContext();
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [originalQuestions, setOriginalQuestions] = useState<GeneratedQuestion[]>([]); // Snapshot für Diff-Berechnung (nur Änderungen senden)
  const [requestId, setRequestId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<number | null>(null); // Ref für setTimeout-Cleanup beim Unmount
  const isFinalizingRef = useRef(false); // Verhindert doppelte Finalize-Requests bei schnellen Mehrfach-Klicks
  const questionJob = activeJob?.jobType === 'generate_questions' ? activeJob : null; // Nur den eigenen Job-Typ lesen

  // Startet den asynchronen Job; das Backend antwortet sofort mit einer job_id, isLoading wird direkt freigegeben.
  const handleFormSubmit = async (values: GenerateRequestFormValues) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setQuestions([]);
    setOriginalQuestions([]);
    setRequestId(null);

    try {
      const result = await generateQuestions(values);
      addJob(result.job_id, 'generate_questions');
    } catch (error) {
      console.error('Fehler beim Starten der Fragen-Generierung:', error);
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
    dismissJob();
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

  const cancelGeneration = async () => {
    if (!questionJob?.jobId || !isGeneratingJob(questionJob.status)) {
      return;
    }

    try {
      await cancelJob(questionJob.jobId);
    } catch (error) {
      console.error('Fehler beim Abbrechen der Fragen-Generierung:', error);
    } finally {
      dismissResults();
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

  useEffect(
    function syncQuestionJobResult() {
      if (!questionJob) {
        return;
      }

      if (questionJob.status === 'failed') {
        setErrorMessage(questionJob.errorMessage ?? 'Fragen konnten nicht generiert werden.');
        return;
      }

      if (questionJob.status !== 'completed' || !questionJob.resultData) {
        return;
      }

      const result = questionJob.resultData as {
        request_id?: string;
        questions?: GeneratedQuestion[];
      };

      if (!result.request_id || !Array.isArray(result.questions)) {
        setErrorMessage('Ungültiges Ergebnisformat vom Job-Status.');
        return;
      }

      setRequestId(result.request_id);
      setQuestions(result.questions);
      setOriginalQuestions(result.questions);
      setErrorMessage(null);
    },
    [questionJob]
  );

  return {
    questions,
    originalQuestions,
    requestId,
    jobId: questionJob?.jobId ?? null,
    jobStatus: questionJob?.status ?? null,
    jobProgress: questionJob?.progress ?? null,
    jobStageLabel: questionJob?.stageLabel ?? null,
    errorMessage,
    successMessage,
    isLoading,
    handleFormSubmit,
    dismissResults,
    handleQuestionChange,
    handleFinalizeQuestions,
    cancelGeneration,
  };
}

function isGeneratingJob(status: 'pending' | 'running' | 'completed' | 'failed'): boolean {
  return status === 'pending' || status === 'running';
}

