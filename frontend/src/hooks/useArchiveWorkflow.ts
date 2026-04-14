// src/hooks/useArchiveWorkflow.ts
// Verwaltet Workflow: Archiv-Themen laden, Fragen eines Themas anzeigen, Bearbeitungsmodus

import { useState, useEffect, useCallback } from 'react';
import { getArchiveTopics, getArchiveQuestions, updateArchiveQuestions, deleteArchiveEntry } from '../services/questionsApi';
import { getUserFriendlyMessage } from '../error-handling/errorMappers';
import type { ArchiveTopic } from '../types/api';
import type { GeneratedQuestion } from '../types/generatedQuestion';

export function useArchiveWorkflow() {
  // State für Themen-Liste
  const [topics, setTopics] = useState<ArchiveTopic[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState<boolean>(true);
  const [topicsError, setTopicsError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // State für Fragen eines ausgewählten Themas
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [archivedQuestions, setArchivedQuestions] = useState<GeneratedQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState<boolean>(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  // State für Bearbeitungsmodus
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editableQuestions, setEditableQuestions] = useState<GeneratedQuestion[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<boolean>(false);

  const resetSelectedTopicState = useCallback(() => {
    setArchivedQuestions([]);
    setEditableQuestions([]);
    setSelectedTopic(null);
    setQuestionsError(null);
    setIsEditMode(false);
    setSaveError(null);
    setSaveSuccess(false);
    setDeleteError(null);
  }, []);

  const resetQuestionViewBeforeLoad = useCallback(() => {
    setQuestionsError(null);
    setSaveError(null);
    setSaveSuccess(false);
    setIsEditMode(false);
  }, []);

  // Themen laden – sofort beim Mount, danach mit 300ms Debounce bei Sucheingabe
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoadingTopics(true);
      setTopicsError(null);
      try {
        const response = await getArchiveTopics(searchTerm || undefined);
        if (!cancelled) setTopics(response.topics);
      } catch (error) {
        console.error('Fehler beim Laden der Archiv-Themen:', error);
        if (!cancelled) setTopicsError(getUserFriendlyMessage(error));
      } finally {
        if (!cancelled) setIsLoadingTopics(false);
      }
    };

    // Erster Load ohne Verzögerung, Suchanfragen mit 300ms Debounce
    const delay = searchTerm ? 300 : 0;
    const timer = setTimeout(load, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  // Lade Fragen, wenn ein Thema ausgewählt wurde
  useEffect(() => {
    if (!selectedRequestId) {
      resetSelectedTopicState();
      return;
    }

    const loadQuestions = async () => {
      setIsLoadingQuestions(true);
      resetQuestionViewBeforeLoad();
      try {
        const response = await getArchiveQuestions(selectedRequestId);
        setArchivedQuestions(response.questions);
        setEditableQuestions([]); // Leeren beim Laden
        setSelectedTopic(response.topic);
      } catch (error) {
        console.error('Fehler beim Laden der archivierten Fragen:', error);
        setQuestionsError(getUserFriendlyMessage(error));
        setArchivedQuestions([]);
        setEditableQuestions([]);
        setSelectedTopic(null);
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    loadQuestions();
  }, [selectedRequestId, resetQuestionViewBeforeLoad, resetSelectedTopicState]);

  // Zurück zur Themen-Liste — Reset erfolgt automatisch über den useEffect
  const handleBackToList = () => {
    setSelectedRequestId(null);
  };

  // Auswahl eines Themas behandeln
  const handleTopicSelect = (requestId: string) => {
    setDeleteSuccess(false);
    setSelectedRequestId(requestId);
  };

  // Bearbeitungsmodus aktivieren: erstelle eine editierbare Kopie
  const handleStartEdit = () => {
    setEditableQuestions(structuredClone(archivedQuestions));
    setIsEditMode(true);
    setSaveError(null);
    setSaveSuccess(false);
  };

  // Änderung an einer Frage im Bearbeitungsmodus
  const handleArchivedQuestionChange = (updatedQuestion: GeneratedQuestion) => {
    setEditableQuestions((prevQuestions) =>
      prevQuestions.map((q) => (q.id === updatedQuestion.id ? updatedQuestion : q))
    );
  };

  // Bearbeitungsmodus abbrechen: verwerfe lokale Änderungen
  const handleCancelEdit = () => {
    setEditableQuestions([]);
    setIsEditMode(false);
    setSaveError(null);
  };

  // Speichere bearbeitete Fragen
  const handleSaveArchivedQuestions = async () => {
    if (!selectedRequestId || editableQuestions.length === 0) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await updateArchiveQuestions(selectedRequestId, editableQuestions);
      setArchivedQuestions(response.questions);
      setEditableQuestions([]);
      setIsEditMode(false);
      setSaveSuccess(true);
    } catch (error) {
      console.error('Fehler beim Speichern der archivierten Fragen:', error);
      setSaveError(getUserFriendlyMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteArchiveEntry = async (requestId: string) => {
    setIsDeleting(true);
    setDeleteError(null);
    setDeleteSuccess(false);

    try {
      await deleteArchiveEntry(requestId);
      setTopics((prev) => prev.filter((t) => t.request_id !== requestId));
      if (selectedRequestId === requestId) {
        setSelectedRequestId(null);
      }
      setDeleteSuccess(true);
    } catch (error) {
      console.error('Fehler beim Löschen des Archiv-Eintrags:', error);
      setDeleteError(getUserFriendlyMessage(error));
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    // States für Themen-Liste
    topics,
    isLoadingTopics,
    topicsError,
    searchTerm,
    setSearchTerm,
    // States für Fragen
    selectedRequestId,
    selectedTopic,
    archivedQuestions,
    isLoadingQuestions,
    questionsError,
    // States für Bearbeitungsmodus
    isEditMode,
    editableQuestions,
    isSaving,
    saveError,
    saveSuccess,
    isDeleting,
    deleteError,
    deleteSuccess,
    // Handlers
    handleBackToList,
    handleTopicSelect,
    handleStartEdit,
    handleArchivedQuestionChange,
    handleCancelEdit,
    handleSaveArchivedQuestions,
    handleDeleteArchiveEntry,
  };
}
