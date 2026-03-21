import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ArchiveTopicCard } from '../../components/ArchiveTopicCard';

describe('ArchiveTopicCard Component', () => {
  const mockTopic = {
    request_id: '123-abc',
    topic: 'Quantenphysik',
    language: 'de',
    question_count: 5,
    types: ['MCQ'],
    created_at: '2026-01-10T10:00:00Z',
    finalized_at: '2026-01-10T11:00:00Z',
  };

  const mockOnSelect = vi.fn();
  const mockFormatDate = (d: string) => d;

  it('sollte den Titel und die Anzahl der Fragen anzeigen', () => {
    render(
      <ArchiveTopicCard
        topic={mockTopic}
        onSelect={mockOnSelect}
        formatDate={mockFormatDate}
      />
    );

    expect(screen.getByText('Quantenphysik')).toBeInTheDocument();
    expect(screen.getByText(/5 Fragen/i)).toBeInTheDocument();
  });

  it('sollte onSelect aufrufen, wenn die Karte angeklickt wird', () => {
    render(
      <ArchiveTopicCard
        topic={mockTopic}
        onSelect={mockOnSelect}
        formatDate={mockFormatDate}
      />
    );

    const card = screen.getByRole('button');
    fireEvent.click(card);

    expect(mockOnSelect).toHaveBeenCalledWith('123-abc');
  });
});
