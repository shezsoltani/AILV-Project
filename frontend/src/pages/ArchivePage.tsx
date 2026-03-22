// src/pages/ArchivePage.tsx
// Liste archivierter Themen. Auswahl lädt die zugehörigen Fragen (nur lesen).

import React from 'react';
import { QuestionsList } from '../components/QuestionsList';
import { ArchiveTopicCard } from '../components/ArchiveTopicCard';
import { ErrorBanner } from '../components/ErrorBanner';
import { formatDateToGerman } from '../utils/dateUtils';
import { useArchiveWorkflow } from '../hooks/useArchiveWorkflow';

const ArchivePage: React.FC = () => {
  // Hook verwaltet den kompletten Workflow: Themen laden, Fragen eines Themas anzeigen
  const {
    topics,
    isLoadingTopics,
    topicsError,
    selectedRequestId,
    selectedTopic,
    archivedQuestions,
    isLoadingQuestions,
    questionsError,
    handleBackToList,
    handleTopicSelect,
  } = useArchiveWorkflow();

  // Render: Fragen für ausgewähltes Thema anzeigen
  if (selectedRequestId) {
    return (
      <div className="page">
        {/* Button zum Zurückkehren zur Themen-Liste */}
        <div className="archive-back-button">
          <button
            type="button"
            className="secondary-button"
            onClick={handleBackToList}
            disabled={isLoadingQuestions}
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

        {/* Liste aller archivierten Fragen (nur lesend) */}
        {!isLoadingQuestions && !questionsError && archivedQuestions.length > 0 && (
          <QuestionsList questions={archivedQuestions} readOnly={true} />
        )}
      </div>
    );
  }

  // Render: Themen-Liste anzeigen (Hauptansicht)
  return (
    <div className="page">
      <h1 className="page-title">Ihre Fragensammlung</h1>
      <p className="page-description">
        Hier finden Sie alle Fragenpakete, die Sie bereits gespeichert haben.
      </p>

      {/* Loading-State während Themen geladen werden */}
      {isLoadingTopics && (
        <div className="archive-loading-state">
          <div className="archive-loading-spinner" aria-hidden="true"></div>
          <p>Themen werden geladen...</p>
        </div>
      )}

      <ErrorBanner message={topicsError} />

      {/* Empty-State wenn noch keine archivierten Themen vorhanden sind */}
      {!isLoadingTopics && !topicsError && topics.length === 0 && (
        <div className="archive-empty-state">
          <div className="archive-empty-state-icon" aria-hidden="true">
            📚
          </div>
          <p className="archive-empty-state-title">Noch keine archivierten Themen vorhanden</p>
          <p className="archive-empty-state-description">
            Generieren und finalisieren Sie Fragen, um sie im Archiv zu sehen.
          </p>
        </div>
      )}

      {/* Liste aller archivierten Themen - jede Card ist klickbar */}
      {!isLoadingTopics && !topicsError && topics.length > 0 && (
        <div className="archive-topics-list">
          {topics.map((topic) => (
            <ArchiveTopicCard
              key={topic.request_id}
              topic={topic}
              onSelect={handleTopicSelect}
              formatDate={formatDateToGerman}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ArchivePage;
