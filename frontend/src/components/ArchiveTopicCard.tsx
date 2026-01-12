// src/components/ArchiveTopicCard.tsx
// Komponente für die Darstellung eines Archiv-Themas als Card

import React from 'react';
import type { ArchiveTopic } from '../types/api';

// Interface für die Props dieser Komponente
interface ArchiveTopicCardProps {
  topic: ArchiveTopic; // Archiv-Thema, das angezeigt werden soll
  onSelect: (requestId: string) => void; // Callback-Funktion bei Klick/Auswahl
  formatDate: (dateString: string) => string; // Funktion zum Formatieren von Datumsstrings
}

export const ArchiveTopicCard: React.FC<ArchiveTopicCardProps> = ({
  topic,
  onSelect,
  formatDate,
}) => {
  // Behandlung des Klick-Events auf die Card
  const handleClick = () => {
    onSelect(topic.request_id);
  };

  // Behandlung der Tastatur-Navigation (Enter oder Leertaste)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(topic.request_id);
    }
  };

  return (
    <div
      className="archive-topic-card"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={`Thema ${topic.topic} öffnen`}
    >
      <div className="archive-topic-header">
        <div className="archive-topic-content">
          {/* Titel und Badges in einer Zeile - Badges rechts oben */}
          <div className="archive-topic-title-wrapper">
            <h2 className="archive-topic-title">{topic.topic}</h2>
            <div className="archive-topic-badges">
              <span className="archive-topic-meta-badge archive-topic-meta-badge--language">
                {topic.language.toUpperCase()}
              </span>
              <span className="archive-topic-meta-badge archive-topic-meta-badge--count">
                {topic.question_count} {topic.question_count === 1 ? 'Frage' : 'Fragen'}
              </span>
            </div>
          </div>
          
          {/* Metadaten des Themas: Zeitstempel */}
          <div className="archive-topic-meta">

            {/* Zeitstempel: Erstellt und Finalisiert */}
            <div className="archive-topic-timestamp">
              <div className="archive-topic-timestamp-item">
                <svg
                  className="archive-topic-icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  <span className="archive-topic-meta-label">Erstellt:</span>{' '}
                  <span className="archive-topic-meta-value">{formatDate(topic.created_at)}</span>
                </span>
              </div>
              <div className="archive-topic-timestamp-item">
                <svg
                  className="archive-topic-icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  <span className="archive-topic-meta-label">Finalisiert:</span>{' '}
                  <span className="archive-topic-meta-value">{formatDate(topic.finalized_at)}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
