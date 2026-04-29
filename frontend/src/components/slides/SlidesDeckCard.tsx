// src/components/slides/SlidesDeckCard.tsx
// Kachel für ein gespeichertes Foliendeck im Folien-Archiv.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { DeckListItem } from '../../types/slides';

interface SlidesDeckCardProps {
  deck: DeckListItem;
  formatDate: (dateString: string) => string;
  onDeleteClick?: (deckId: string) => void;
  deleteDisabled?: boolean;
}

export const SlidesDeckCard: React.FC<SlidesDeckCardProps> = ({
  deck,
  formatDate,
  onDeleteClick,
  deleteDisabled = false,
}) => {
  const navigate = useNavigate();

  const handleNavigate = () => navigate(`/slides/archive/${deck.id}`);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleNavigate();
    }
  };

  return (
    <div 
      className="archive-topic-card" 
      onClick={handleNavigate}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={`Foliendeck ${deck.name} ansehen`}
    >
      <div className="archive-topic-header">
        <div className="archive-topic-content">
          <div className="archive-topic-header-row">
            <div className="archive-topic-title-wrapper">
              <h2 className="archive-topic-title">{deck.name}</h2>

              <div className="archive-topic-badges">
                <span className="archive-topic-meta-badge archive-topic-meta-badge--count">
                  {deck.slide_count} {deck.slide_count === 1 ? 'Folie' : 'Folien'}
                </span>
                {onDeleteClick && (
                  <button
                    type="button"
                    className="archive-topic-delete-button"
                    style={{ marginLeft: 'var(--spacing-sm)' }}
                    aria-label={`Deck ${deck.name} löschen`}
                    disabled={deleteDisabled}
                    onClick={function (e) {
                      e.stopPropagation();
                      onDeleteClick(deck.id);
                    }}
                  >
                    Löschen
                  </button>
                )}
              </div>
            </div>

            </div>

          <div className="archive-topic-meta">
            <div className="archive-topic-timestamp">
              <div className="archive-topic-timestamp-item">
                <span>
                  <span className="archive-topic-meta-label">Erstellt:</span>{' '}
                  <span className="archive-topic-meta-value">
                    {deck.created_at ? formatDate(deck.created_at) : 'Kein Datum verfügbar'}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};