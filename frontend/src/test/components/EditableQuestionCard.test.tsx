import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EditableQuestionCard } from '../../components/EditableQuestionCard';

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
});