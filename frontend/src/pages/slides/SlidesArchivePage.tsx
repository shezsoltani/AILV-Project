// src/pages/SlidesArchivePage.tsx
// Archivseite für gespeicherte Foliendecks.

import React from 'react';
import { SlidesDeckCard } from '../../components/slides';
import { ErrorBanner, ConfirmDialog } from '../../components/shared';
import { listDecks, deleteDeck } from '../../services/slidesApi';
import type { DeckListItem } from '../../types/slides';
import { formatDateToGerman } from '../../utils/dateUtils';

export const SlidesArchivePage: React.FC = () => {
  const [decks, setDecks] = React.useState<DeckListItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [deleteDeckId, setDeleteDeckId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    async function loadDecks() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await listDecks();

        setDecks(response.decks);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Foliendecks konnten nicht geladen werden.');
      } finally {
        setIsLoading(false);
      }
    }

    loadDecks();
  }, []);

  const handleDeleteClick = (deckId: string) => {
    setDeleteDeckId(deckId);
  };

  const handleConfirmDelete = async () => {
    if (!deleteDeckId) return;

    try {
      setIsDeleting(true);
      await deleteDeck(deleteDeckId);
      setDecks(decks.filter((d) => d.id !== deleteDeckId));
      setDeleteDeckId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Foliendeck konnte nicht gelöscht werden.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDeckId(null);
  };

  return (
    <div className="page">
      <h1 className="page-title">Folien-Archiv</h1>
      <p className="page-description">
        Hier finden Sie alle gespeicherten Foliendecks.
      </p>

      {isLoading && (
        <div className="archive-loading-state">
          <div className="archive-loading-spinner" aria-hidden="true"></div>
          <p>Foliendecks werden geladen...</p>
        </div>
      )}

      <ErrorBanner message={error} />

      {!isLoading && !error && decks.length === 0 && (
        <div className="archive-empty-state">
          <div className="archive-empty-state-icon" aria-hidden="true">
            Folien
          </div>
          <p className="archive-empty-state-title">
            Noch keine Foliendecks gespeichert
          </p>
          <p className="archive-empty-state-description">
            Generieren und speichern Sie Folien, um sie hier wiederzufinden.
          </p>
        </div>
      )}

      {!isLoading && !error && decks.length > 0 && (
        <div className="archive-topics-list">
          {decks.map((deck) => (
            <SlidesDeckCard
              key={deck.id}
              deck={deck}
              formatDate={formatDateToGerman}
              onDeleteClick={handleDeleteClick}
              deleteDisabled={isDeleting}
            />
          ))}
        </div>
      )}
      <ConfirmDialog
        isOpen={!!deleteDeckId}
        title="Foliendeck löschen"
        description="Sind Sie sicher, dass Sie dieses Foliendeck dauerhaft löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden."
        confirmLabel={isDeleting ? 'Lösche...' : 'Löschen'}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
};