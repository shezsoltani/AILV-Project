import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SlidesArchivePage } from '../../pages/slides/SlidesArchivePage';
import * as slidesApi from '../../services/slidesApi';

vi.mock('../../services/slidesApi', () => ({
  listDecks: vi.fn(),
  deleteDeck: vi.fn(),
}));

const mockDeck = {
  id: 'deck-1',
  request_id: 'req-slides-1',
  name: 'Neuronale Netze',
  created_at: '2026-01-10T10:00:00Z',
  slide_count: 3,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <SlidesArchivePage />
    </MemoryRouter>,
  );
}

describe('SlidesArchivePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lädt und zeigt archivierte Foliendecks an', async () => {
    (slidesApi.listDecks as any).mockResolvedValue({ decks: [mockDeck] });

    renderPage();

    expect(screen.getByText(/Foliendecks werden geladen/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Neuronale Netze')).toBeInTheDocument();
    });

    expect(screen.getByText(/3 Folien/i)).toBeInTheDocument();
    expect(slidesApi.listDecks).toHaveBeenCalled();
  });

  it('zeigt Empty-State, wenn keine Decks vorhanden sind', async () => {
    (slidesApi.listDecks as any).mockResolvedValue({ decks: [] });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Noch keine Foliendecks gespeichert/i)).toBeInTheDocument();
    });
  });

  it('stellt Ladefehler sichtbar dar', async () => {
    (slidesApi.listDecks as any).mockRejectedValue(
      new Error('Foliendecks konnten nicht geladen werden.'),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /Foliendecks konnten nicht geladen werden/i,
      );
    });
  });
});
