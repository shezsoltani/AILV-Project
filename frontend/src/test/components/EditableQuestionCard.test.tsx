import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EditableQuestionCard } from '../../components/generate';

describe('EditableQuestionCard Interactions', () => {
  const mockQuestion = {
    id: 'q1',
    question: 'Was ist die Hauptstadt?',
    type: 'SHORT_ANSWER',
    difficulty: 'easy',
    answer: 'Wien'
  };

  it('sollte onQuestionChange aufrufen, wenn die Antwort bearbeitet wird', () => {
    const mockOnChange = vi.fn();
    render(<EditableQuestionCard question={mockQuestion as any} onQuestionChange={mockOnChange} />);
    
    // Suche das Feld mit dem aktuellen Antwort-Wert
    const input = screen.getByDisplayValue('Wien');
    fireEvent.change(input, { target: { value: 'Salzburg' } });

    // Prüfen, ob die Callback-Funktion getriggert wurde
    expect(mockOnChange).toHaveBeenCalled();
  });

  it('sollte im readOnly-Modus keine Bearbeitung zulassen', () => {
    render(<EditableQuestionCard question={mockQuestion as any} readOnly={true} onQuestionChange={() => {}} />);
    const input = screen.getByDisplayValue('Wien');
    expect(input).toHaveAttribute('readOnly');
  });

  it('sollte leere Fragetexte weitergeben (Validierung erfolgt serverseitig)', () => {
    const mockOnChange = vi.fn();
    render(<EditableQuestionCard question={mockQuestion as any} onQuestionChange={mockOnChange} />);

    const questionInput = screen.getByDisplayValue('Was ist die Hauptstadt?');
    fireEvent.change(questionInput, { target: { value: '' } });

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ question: '', answer: 'Wien' }),
    );
  });
});
