// src/pages/archive/ArchiveQuestionDetailView.tsx
// Detail-Ansicht eines archivierten Themas: Liste der Fragen mit Edit-/Save-/Delete-Aktionen.

import React from 'react';
import { QuestionsList } from '../../components/generate';
import { ErrorBanner } from '../../components/shared';
import type { GeneratedQuestion } from '../../types/generatedQuestion';

interface ArchiveQuestionDetailViewProps {
  selectedRequestId: string;
  selectedTopic: string | null;
  archivedQuestions: GeneratedQuestion[];
  isLoadingQuestions: boolean;
  questionsError: string | null;
  saveError: string | null;
  deleteError: string | null;
  saveSuccess: boolean;
  isEditMode: boolean;
  editableQuestions: GeneratedQuestion[];
  isSaving: boolean;
  isDeleting: boolean;
  onBackToList: () => void;
  onStartEdit: () => void;
  onArchivedQuestionChange: (q: GeneratedQuestion) => void;
  onCancelEdit: () => void;
  onSaveArchivedQuestions: () => void | Promise<void>;
  onRequestDelete: (requestId: string) => void;
}

export const ArchiveQuestionDetailView: React.FC<ArchiveQuestionDetailViewProps> = ({
  selectedRequestId,
  selectedTopic,
  archivedQuestions,
  isLoadingQuestions,
  questionsError,
  saveError,
  deleteError,
  saveSuccess,
  isEditMode,
  editableQuestions,
  isSaving,
  isDeleting,
  onBackToList,
  onStartEdit,
  onArchivedQuestionChange,
  onCancelEdit,
  onSaveArchivedQuestions,
  onRequestDelete,
}) => {
  return (
    <div className="page">
      {/* Button zum Zurückkehren zur Themen-Liste */}
      <div className="archive-back-button">
        <button
          type="button"
          className="secondary-button"
          onClick={onBackToList}
          disabled={isLoadingQuestions || isSaving || isDeleting}
        >
          <svg
            className="archive-back-icon"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Zurück zur Liste
        </button>
      </div>

      {/* Titel mit dem Namen des ausgewählten Themas */}
      <h1 className="page-title">
        Archiv: {selectedTopic || 'Laden...'}
      </h1>

      {/* Loading-State während Fragen geladen werden */}
      {isLoadingQuestions && (
        <div className="archive-loading-state">
          <div className="archive-loading-spinner" aria-hidden="true"></div>
          <p>Fragen werden geladen...</p>
        </div>
      )}

      <ErrorBanner message={questionsError} />
      <ErrorBanner message={saveError} />
      <ErrorBanner message={deleteError} />
      {saveSuccess && (
        <div className="success-banner" role="status">
          <div className="success-banner-content">
            <strong>Gespeichert:</strong> Die Fragen wurden erfolgreich aktualisiert.
          </div>
        </div>
      )}

      {/* Empty-State wenn keine Fragen gefunden wurden */}
      {!isLoadingQuestions && !questionsError && archivedQuestions.length === 0 && (
        <div className="archive-empty-state">
          <div className="archive-empty-state-icon" aria-hidden="true">
            📋
          </div>
          <p className="archive-empty-state-title">Keine Fragen gefunden</p>
          <p className="archive-empty-state-description">
            Zu diesem Thema wurden keine archivierten Fragen gefunden.
          </p>
        </div>
      )}

      {/* Liste aller archivierten Fragen */}
      {!isLoadingQuestions && !questionsError && archivedQuestions.length > 0 && (
        <>
          {/* Aktionsleiste: Edit-Button oder Save/Cancel-Buttons */}
          {!isEditMode && (
            <div className="archive-action-bar">
              <button
                type="button"
                className="primary-button archive-button-with-icon"
                onClick={onStartEdit}
                disabled={isLoadingQuestions || isSaving || isDeleting}
              >
                <svg
                  className="archive-btn-icon"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6h4.75"
                  />
                </svg>
                Bearbeiten
              </button>
              <button
                type="button"
                className="secondary-button archive-button-with-icon"
                onClick={() => onRequestDelete(selectedRequestId)}
                disabled={isLoadingQuestions || isSaving || isDeleting}
                aria-label="Archiv-Eintrag löschen"
              >
                <svg
                  className="archive-btn-icon"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Löschen
              </button>
            </div>
          )}

          {isEditMode && (
            <div className="archive-action-bar archive-action-bar--edit">
              <button
                type="button"
                className="primary-button archive-button-with-icon"
                onClick={onSaveArchivedQuestions}
                disabled={isSaving || editableQuestions.length === 0 || isDeleting}
              >
                {isSaving ? (
                  <>
                    <span className="archive-btn-spinner" aria-hidden="true" />
                    Wird gespeichert…
                  </>
                ) : (
                  <>
                    <svg
                      className="archive-btn-icon"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                      />
                    </svg>
                    Speichern
                  </>
                )}
              </button>
              <button
                type="button"
                className="secondary-button archive-button-with-icon"
                onClick={onCancelEdit}
                disabled={isSaving || isDeleting}
              >
                <svg
                  className="archive-btn-icon"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
                Abbrechen
              </button>
            </div>
          )}

          {/* QuestionsList: Im Edit-Mode bearbeitbar, sonst read-only */}
          <QuestionsList
            questions={isEditMode ? editableQuestions : archivedQuestions}
            onQuestionChange={isEditMode ? onArchivedQuestionChange : undefined}
            readOnly={!isEditMode}
          />
        </>
      )}
    </div>
  );
};
