// src/hooks/useArchiveWorkflow.ts
// Verwaltet Workflow: Archiv-Themen laden, Fragen eines Themas anzeigen

import { useState, useEffect } from 'react';
import { getArchiveTopics, getArchiveQuestions } from '../services/questionsApi';
import { getUserFriendlyMessage } from '../utils/errorUtils';
import type { ArchiveTopic } from '../types/api';
import type { GeneratedQuestion } from '../types/generatedQuestion';

export function useArchiveWorkflow() {
  // State für Themen-Liste
  const [topics, setTopics] = useState<ArchiveTopic[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState<boolean>(true);
  const [topicsError, setTopicsError] = useState<string | null>(null);

  // State für Fragen eines ausgewählten Themas
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [archivedQuestions, setArchivedQuestions] = useState<GeneratedQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState<boolean>(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  // Lade Themen beim Mount
  useEffect(() => {
    const loadTopics = async () => {
      setIsLoadingTopics(true);
      setTopicsError(null);
      try {
        const response = await getArchiveTopics();
        setTopics(response.topics);
      } catch (error) {
        console.error('Fehler beim Laden der Archiv-Themen:', error);
        setTopicsError(getUserFriendlyMessage(error));
      } finally {
        setIsLoadingTopics(false);
      }
    };

    loadTopics();
  }, []);

  // Lade Fragen, wenn ein Thema ausgewählt wurde
  useEffect(() => {
    if (!selectedRequestId) {
      setArchivedQuestions([]);
      setSelectedTopic(null);
      setQuestionsError(null);
      return;
    }

    const loadQuestions = async () => {
      setIsLoadingQuestions(true);
      setQuestionsError(null);
      try {
        const response = await getArchiveQuestions(selectedRequestId);
        setArchivedQuestions(response.questions);
        setSelectedTopic(response.topic);
      } catch (error) {
        console.error('Fehler beim Laden der archivierten Fragen:', error);
        setQuestionsError(getUserFriendlyMessage(error));
        setArchivedQuestions([]);
        setSelectedTopic(null);
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    loadQuestions();
  }, [selectedRequestId]);

  // Zurück zur Themen-Liste
  const handleBackToList = () => {
    setSelectedRequestId(null);
    setSelectedTopic(null);
    setArchivedQuestions([]);
    setQuestionsError(null);
  };

  // Auswahl eines Themas behandeln
  const handleTopicSelect = (requestId: string) => {
    setSelectedRequestId(requestId);
  };

  return {
    // States für Themen-Liste
    topics,
    isLoadingTopics,
    topicsError,
    // States für Fragen
    selectedRequestId,
    selectedTopic,
    archivedQuestions,
    isLoadingQuestions,
    questionsError,
    // Handlers
    handleBackToList,
    handleTopicSelect,
  };
}
