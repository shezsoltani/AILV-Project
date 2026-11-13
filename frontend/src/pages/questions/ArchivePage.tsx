// src/pages/ArchivePage.tsx
// Orchestrator: schaltet zwischen Themen-Liste und Detail-Ansicht und steuert den Lösch-Dialog.

import React from 'react';
import { ConfirmDialog } from '../../components/shared';
import { useArchiveWorkflow } from '../../hooks/questions/useArchiveWorkflow';
import { ArchiveTopicListView } from './ArchiveTopicListView';
import { ArchiveQuestionDetailView } from './ArchiveQuestionDetailView';

export const ArchivePage: React.FC = () => {
  // Hook verwaltet den kompletten Workflow: Themen laden, Fragen eines Themas anzeigen, Bearbeitung
  const {
    courses = [],
    coursesError = null,
    selectedCourseIds = [],
    filterUnassigned = false,
    groupedTopics = {},
    handleSelectAll,
    handleSelectUnassigned,
    handleToggleCourse,
    topics,
    isLoadingTopics,
    topicsError,
    searchTerm = '',
    setSearchTerm,
    selectedRequestId,
    selectedTopic,
    archivedQuestions = [],
    isLoadingQuestions,
    questionsError,
    isEditMode,
    editableQuestions = [],
    isSaving,
    saveError,
    saveSuccess,
    isDeleting,
    deleteError,
    deleteSuccess,
    handleBackToList,
    handleTopicSelect,
    handleStartEdit,
    handleArchivedQuestionChange,
    handleCancelEdit,
    handleSaveArchivedQuestions,
    handleDeleteArchiveEntry,
  } = useArchiveWorkflow();

  const activeFilterName = React.useMemo(() => {
    let base: string | null = null;
    if (filterUnassigned) base = 'Ohne LV / Allgemein';
    else if (selectedCourseIds.length > 0) {
      const names = selectedCourseIds
        .map((cid) => courses.find((c) => c.id === cid)?.name)
        .filter(Boolean);
      base = names.join(', ');
    }
    const cleanTerm = (searchTerm || '').trim();
    if (cleanTerm) {
      return base ? `${base} (Suche: "${cleanTerm}")` : `Suche: "${cleanTerm}"`;
    }
    return base;
  }, [filterUnassigned, selectedCourseIds, courses, searchTerm]);

  const filteredArchivedQuestions = React.useMemo(() => {
    const term = (searchTerm || '').trim().toLowerCase();
    if (!term) return archivedQuestions;
    if (selectedTopic && selectedTopic.toLowerCase().includes(term)) {
      return archivedQuestions;
    }
    return archivedQuestions.filter((q) => {
      const inQuestion = q.question?.toLowerCase().includes(term);
      const inAnswer = q.answer?.toLowerCase().includes(term);
      const inRationale = q.rationale?.toLowerCase().includes(term);
      const inChoices = q.choices?.some((c) => c.toLowerCase().includes(term));
      return inQuestion || inAnswer || inRationale || inChoices;
    });
  }, [archivedQuestions, searchTerm, selectedTopic]);

  const filteredEditableQuestions = React.useMemo(() => {
    const term = (searchTerm || '').trim().toLowerCase();
    if (!term) return editableQuestions;
    if (selectedTopic && selectedTopic.toLowerCase().includes(term)) {
      return editableQuestions;
    }
    return editableQuestions.filter((q) => {
      const inQuestion = q.question?.toLowerCase().includes(term);
      const inAnswer = q.answer?.toLowerCase().includes(term);
      const inRationale = q.rationale?.toLowerCase().includes(term);
      const inChoices = q.choices?.some((c) => c.toLowerCase().includes(term));
      return inQuestion || inAnswer || inRationale || inChoices;
    });
  }, [editableQuestions, searchTerm, selectedTopic]);

  const [deleteDialogRequestId, setDeleteDialogRequestId] = React.useState<string | null>(null);

  const openDeleteDialog = (requestId: string) => {
    setDeleteDialogRequestId(requestId);
  };
  const closeDeleteDialog = () => {
    if (!isDeleting) {
      setDeleteDialogRequestId(null);
    }
  };
  const confirmDelete = async () => {
    if (!deleteDialogRequestId) return;
    await handleDeleteArchiveEntry(deleteDialogRequestId);
    setDeleteDialogRequestId(null);
  };

  return (
    <>
      {selectedRequestId ? (
        <ArchiveQuestionDetailView
          selectedRequestId={selectedRequestId}
          selectedTopic={selectedTopic}
          archivedQuestions={filteredArchivedQuestions}
          isLoadingQuestions={isLoadingQuestions}
          questionsError={questionsError}
          saveError={saveError}
          deleteError={deleteError}
          saveSuccess={saveSuccess}
          isEditMode={isEditMode}
          editableQuestions={filteredEditableQuestions}
          isSaving={isSaving}
          isDeleting={isDeleting}
          onBackToList={handleBackToList}
          onStartEdit={handleStartEdit}
          onArchivedQuestionChange={handleArchivedQuestionChange}
          onCancelEdit={handleCancelEdit}
          onSaveArchivedQuestions={handleSaveArchivedQuestions}
          onRequestDelete={openDeleteDialog}
          activeFilterName={activeFilterName}
        />
      ) : (
        <ArchiveTopicListView
          topics={topics}
          isLoadingTopics={isLoadingTopics}
          topicsError={topicsError}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          deleteError={deleteError}
          deleteSuccess={deleteSuccess}
          isDeleting={isDeleting}
          onTopicSelect={handleTopicSelect}
          onRequestDelete={openDeleteDialog}
          courses={courses}
          coursesError={coursesError}
          selectedCourseIds={selectedCourseIds}
          filterUnassigned={filterUnassigned}
          groupedTopics={groupedTopics}
          onSelectAll={handleSelectAll}
          onSelectUnassigned={handleSelectUnassigned}
          onToggleCourse={handleToggleCourse}
        />
      )}
      <ConfirmDialog
        isOpen={Boolean(deleteDialogRequestId)}
        title="Archiv-Eintrag löschen"
        description="Dieser Archiv-Eintrag wird unwiderruflich gelöscht. Möchten Sie fortfahren?"
        confirmLabel={isDeleting ? 'Wird gelöscht…' : 'Endgültig löschen'}
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={closeDeleteDialog}
      />
    </>
  );
};
