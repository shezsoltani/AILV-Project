// src/pages/archive/ArchiveTopicListView.tsx
// Hauptansicht des Archivs: Suchfeld, Loading-/Empty-/Error-States und Liste der archivierten Themen.

import React from 'react';
import { ArchiveTopicCard } from '../../components/archive';
import { ErrorBanner } from '../../components/shared';
import { formatDateToGerman } from '../../utils/dateUtils';
import type { ArchiveTopic } from '../../types/api';
import type { Course } from '../../types/courses';

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
  courses?: Course[];
  coursesError?: string | null;
  selectedCourseIds?: string[];
  filterUnassigned?: boolean;
  groupedTopics?: Record<string, ArchiveTopic[]>;
  onSelectAll?: () => void;
  onSelectUnassigned?: () => void;
  onToggleCourse?: (courseId: string) => void;
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
  courses = [],
  coursesError = null,
  selectedCourseIds = [],
  filterUnassigned = false,
  groupedTopics = {},
  onSelectAll,
  onSelectUnassigned,
  onToggleCourse,
}) => {
  const isAllSelected = selectedCourseIds.length === 0 && !filterUnassigned;
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

      {/* Filter-Auswahl: Alle, Ohne LV / Allgemein, eigene Lehrveranstaltungen */}
      <div className="archive-filter-bar" role="toolbar" aria-label="Archiv nach Lehrveranstaltungen filtern">
        <span className="archive-filter-label">Filter:</span>
        <button
          type="button"
          className={`archive-filter-btn ${isAllSelected ? 'archive-filter-btn--active' : ''}`}
          onClick={onSelectAll}
          aria-pressed={isAllSelected}
        >
          Alle
        </button>
        <button
          type="button"
          className={`archive-filter-btn ${filterUnassigned ? 'archive-filter-btn--active' : ''}`}
          onClick={onSelectUnassigned}
          aria-pressed={filterUnassigned}
        >
          Ohne LV / Allgemein
        </button>
        {courses.map((course) => {
          const isSelected = selectedCourseIds.includes(course.id);
          return (
            <button
              key={course.id}
              type="button"
              className={`archive-filter-btn ${isSelected ? 'archive-filter-btn--active' : ''}`}
              onClick={() => onToggleCourse?.(course.id)}
              aria-pressed={isSelected}
            >
              {course.name}
            </button>
          );
        })}
      </div>

      {/* Loading-State während Themen geladen werden */}
      {isLoadingTopics && (
        <div className="archive-loading-state">
          <div className="archive-loading-spinner" aria-hidden="true"></div>
          <p>Themen werden geladen...</p>
        </div>
      )}

      <ErrorBanner message={topicsError} />
      <ErrorBanner message={coursesError} />
      <ErrorBanner message={deleteError} />

      {deleteSuccess && (
        <div className="success-banner" role="status">
          <div className="success-banner-content">
            <strong>Gelöscht:</strong> Der Archiv-Eintrag wurde entfernt.
          </div>
        </div>
      )}

      {/* Ansicht für 'Alle' */}
      {isAllSelected && !isLoadingTopics && !topicsError && (
        <>
          {topics.length === 0 ? (
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
          ) : (
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
        </>
      )}

      {/* Ansicht für 'Ohne LV / Allgemein' */}
      {filterUnassigned && !isLoadingTopics && !topicsError && (
        <div className="archive-group-section">
          <div className="archive-group-header">
            <h2 className="archive-group-title">Allgemein</h2>
          </div>
          {topics.length > 0 ? (
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
          ) : (
            <div className="archive-group-empty">
              <p>Keine Fragen für diese LV gefunden</p>
            </div>
          )}
        </div>
      )}

      {/* Ansicht für ausgewählte Lehrveranstaltungen (gegliederte Übersicht) */}
      {selectedCourseIds.length > 0 && !isLoadingTopics && !topicsError && (
        <div className="archive-groups-container">
          {selectedCourseIds.map((cid) => {
            const course = courses.find((c) => c.id === cid);
            const courseTopics = groupedTopics[cid] ?? [];
            const courseName = course ? course.name : 'Lehrveranstaltung';
            return (
              <div key={cid} className="archive-group-section">
                <div className="archive-group-header">
                  <h2 className="archive-group-title">{courseName}</h2>
                </div>
                {courseTopics.length > 0 ? (
                  <div className="archive-topics-list">
                    {courseTopics.map((topic) => (
                      <ArchiveTopicCard
                        key={`${cid}-${topic.request_id}`}
                        topic={topic}
                        onSelect={onTopicSelect}
                        formatDate={formatDateToGerman}
                        onDeleteClick={onRequestDelete}
                        deleteDisabled={isDeleting}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="archive-group-empty">
                    <p>Keine Fragen für diese LV gefunden</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
