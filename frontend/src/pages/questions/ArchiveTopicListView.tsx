// src/pages/archive/ArchiveTopicListView.tsx
// Hauptansicht des Archivs: Suchfeld, Loading-/Empty-/Error-States und Liste der archivierten Themen.

import React from 'react';
import { ArchiveTopicCard } from '../../components/archive';
import { ErrorBanner } from '../../components/shared';
import { formatDateToGerman } from '../../utils/dateUtils';
import type { ArchiveTopic } from '../../types/api';

interface ArchiveTopicListViewProps {
  topics: ArchiveTopic[];
  isLoadingTopics: boolean;
  topicsError: string | null;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  deleteError: string | null;
  deleteSuccess: boolean;
  isDeleting: boolean;
  onTopicSelect: (requestId: string) => void;
  onRequestDelete: (requestId: string) => void;
}

export const ArchiveTopicListView: React.FC<ArchiveTopicListViewProps> = ({
  topics,
  isLoadingTopics,
  topicsError,
  searchTerm,
  setSearchTerm,
  deleteError,
  deleteSuccess,
  isDeleting,
  onTopicSelect,
  onRequestDelete,
}) => {
  return (
    <div className="page">
      <h1 className="page-title">Ihre Fragensammlung</h1>
      <p className="page-description">
        Hier finden Sie alle Fragenpakete, die Sie bereits gespeichert haben.
      </p>

      {/* Suchfeld – filtert Themen nach Titel und Frageinhalt */}
      <div className="archive-search-wrapper">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="archive-search-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="search"
          className="archive-search-input"
          placeholder="Nach Thema oder Frageinhalt suchen…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Archiv durchsuchen"
        />
      </div>

      {/* Loading-State während Themen geladen werden */}
      {isLoadingTopics && (
        <div className="archive-loading-state">
          <div className="archive-loading-spinner" aria-hidden="true"></div>
          <p>Themen werden geladen...</p>
        </div>
      )}

      <ErrorBanner message={topicsError} />
      <ErrorBanner message={deleteError} />

      {deleteSuccess && (
        <div className="success-banner" role="status">
          <div className="success-banner-content">
            <strong>Gelöscht:</strong> Der Archiv-Eintrag wurde entfernt.
          </div>
        </div>
      )}

      {/* Empty-State: unterscheidet zwischen Suche ohne Treffer und leerem Archiv */}
      {!isLoadingTopics && !topicsError && topics.length === 0 && (
        <div className="archive-empty-state">
          {searchTerm.trim() ? (
            <>
              <div className="archive-empty-state-icon" aria-hidden="true">🔍</div>
              <p className="archive-empty-state-title">Keine Treffer gefunden</p>
              <p className="archive-empty-state-description">
                Zu „{searchTerm.trim()}" wurden keine Themen oder Fragen gefunden.
              </p>
            </>
          ) : (
            <>
              <div className="archive-empty-state-icon" aria-hidden="true">📚</div>
              <p className="archive-empty-state-title">Noch keine archivierten Themen vorhanden</p>
              <p className="archive-empty-state-description">
                Generieren und finalisieren Sie Fragen, um sie im Archiv zu sehen.
              </p>
            </>
          )}
        </div>
      )}

      {/* Liste aller archivierten Themen - jede Card ist klickbar */}
      {!isLoadingTopics && !topicsError && topics.length > 0 && (
        <div className="archive-topics-list">
          {topics.map((topic) => (
            <ArchiveTopicCard
              key={topic.request_id}
              topic={topic}
              onSelect={onTopicSelect}
              formatDate={formatDateToGerman}
              onDeleteClick={onRequestDelete}
              deleteDisabled={isDeleting}
            />
          ))}
        </div>
      )}
    </div>
  );
};
