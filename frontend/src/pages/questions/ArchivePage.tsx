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
    topics,
    isLoadingTopics,
    topicsError,
    searchTerm,
    setSearchTerm,
    selectedRequestId,
    selectedTopic,
    archivedQuestions,
    isLoadingQuestions,
    questionsError,
    isEditMode,
    editableQuestions,
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
          archivedQuestions={archivedQuestions}
          isLoadingQuestions={isLoadingQuestions}
          questionsError={questionsError}
          saveError={saveError}
          deleteError={deleteError}
          saveSuccess={saveSuccess}
          isEditMode={isEditMode}
          editableQuestions={editableQuestions}
          isSaving={isSaving}
          isDeleting={isDeleting}
          onBackToList={handleBackToList}
          onStartEdit={handleStartEdit}
          onArchivedQuestionChange={handleArchivedQuestionChange}
          onCancelEdit={handleCancelEdit}
          onSaveArchivedQuestions={handleSaveArchivedQuestions}
          onRequestDelete={openDeleteDialog}
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
