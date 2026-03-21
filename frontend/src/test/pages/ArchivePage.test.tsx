import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ArchivePage from '../../pages/ArchivePage';

// Mocking des Hooks, um verschiedene Zustände zu simulieren
vi.mock('../../hooks/useArchiveWorkflow', () => ({
  useArchiveWorkflow: () => ({
    topics: [],
    isLoadingTopics: false,
    topicsError: 'Fehler beim Laden der Themen', // Wir simulieren einen Fehlertext
    selectedRequestId: null,
    handleTopicSelect: vi.fn(),
  }),
}));

describe('ArchivePage UI States', () => {
  it('sollte eine Fehlermeldung anzeigen, wenn topicsError gesetzt ist', () => {
    render(<ArchivePage />);
    // Prüft, ob der Fehler-String im Dokument erscheint
    expect(screen.getByText(/Fehler beim Laden der Themen/i)).toBeInTheDocument();
  });
});