// src/hooks/questions/useArchiveWorkflow.ts
// Verwaltet Workflow: Archiv-Themen laden, Fragen eines Themas anzeigen, Bearbeitungsmodus

import { useState, useEffect, useCallback } from 'react';
import { getArchiveTopics, getArchiveQuestions, updateArchiveQuestions, deleteArchiveEntry } from '../../services/questionsApi';
import { listCourses } from '../../services/coursesApi';
import { getUserFriendlyMessage } from '../../error-handling/errorMappers';
import type { ArchiveTopic, ArchiveFilterOptions } from '../../types/api';
import type { Course } from '../../types/courses';
import type { GeneratedQuestion } from '../../types/generatedQuestion';

export function useArchiveWorkflow() {
  // State für Lehrveranstaltungen und Filter
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [filterUnassigned, setFilterUnassigned] = useState<boolean>(false);
  const [groupedTopics, setGroupedTopics] = useState<Record<string, ArchiveTopic[]>>({});

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

  // Lehrveranstaltungen beim Mounten laden
  useEffect(() => {
    let cancelled = false;
    const loadCourses = async () => {
      try {
        const data = await listCourses();
        if (!cancelled) setCourses(data);
      } catch (error) {
        console.error('Fehler beim Laden der Lehrveranstaltungen:', error);
        if (!cancelled) setCoursesError(getUserFriendlyMessage(error));
      }
    };
    loadCourses();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filter-Aktionen
  const handleSelectAll = useCallback(() => {
    setSelectedCourseIds([]);
    setFilterUnassigned(false);
  }, []);

  const handleSelectUnassigned = useCallback(() => {
    setSelectedCourseIds([]);
    setFilterUnassigned(true);
  }, []);

  const handleToggleCourse = useCallback((courseId: string) => {
    setFilterUnassigned(false);
    setSelectedCourseIds((prev) => {
      if (prev.includes(courseId)) {
        return prev.filter((id) => id !== courseId);
      }
      return [...prev, courseId];
    });
  }, []);

  // Aktive Filteroptionen ermitteln
  const activeFilter: ArchiveFilterOptions = filterUnassigned
    ? { unassigned: true }
    : selectedCourseIds.length > 0
    ? { courseIds: selectedCourseIds }
    : {};

  // Themen laden – sofort beim Mount/Filterwechsel, danach mit 300ms Debounce bei Sucheingabe
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoadingTopics(true);
      setTopicsError(null);
      try {
        if (filterUnassigned) {
          const response = await getArchiveTopics(searchTerm || undefined, { unassigned: true });
          if (!cancelled) {
            setTopics(response.topics);
            setGroupedTopics({ unassigned: response.topics });
          }
        } else if (selectedCourseIds.length > 0) {
          const combinedResponse = await getArchiveTopics(searchTerm || undefined, { courseIds: selectedCourseIds });
          const groupResults = await Promise.all(
            selectedCourseIds.map(async (cid) => {
              const res = await getArchiveTopics(searchTerm || undefined, { courseIds: [cid] });
              return { courseId: cid, topics: res.topics };
            })
          );
          if (!cancelled) {
            setTopics(combinedResponse.topics);
            const groupMap: Record<string, ArchiveTopic[]> = {};
            groupResults.forEach((gr) => {
              groupMap[gr.courseId] = gr.topics;
            });
            setGroupedTopics(groupMap);
          }
        } else {
          const response = await getArchiveTopics(searchTerm || undefined);
          if (!cancelled) {
            setTopics(response.topics);
            setGroupedTopics({});
          }
        }
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
  }, [searchTerm, selectedCourseIds, filterUnassigned]);

  // Lade Fragen, wenn ein Thema ausgewählt wurde – mit Erhalt des aktiven Filters
  useEffect(() => {
    if (!selectedRequestId) {
      resetSelectedTopicState();
      return;
    }

    const loadQuestions = async () => {
      setIsLoadingQuestions(true);
      resetQuestionViewBeforeLoad();
      try {
        const currentFilter: ArchiveFilterOptions = filterUnassigned
          ? { unassigned: true }
          : selectedCourseIds.length > 0
          ? { courseIds: selectedCourseIds }
          : {};
        const response = await getArchiveQuestions(selectedRequestId, currentFilter);
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
  }, [selectedRequestId, filterUnassigned, selectedCourseIds, resetQuestionViewBeforeLoad, resetSelectedTopicState]);

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
    // States für Lehrveranstaltungen und Filter
    courses,
    coursesError,
    selectedCourseIds,
    filterUnassigned,
    groupedTopics,
    activeFilter,
    handleSelectAll,
    handleSelectUnassigned,
    handleToggleCourse,
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
