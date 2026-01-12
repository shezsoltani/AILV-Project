import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QuestionsList } from '../../components/QuestionsList';
import { GeneratedQuestion } from '../../types/generatedQuestion';

describe('QuestionsList Component', () => {
  const mockQuestions: GeneratedQuestion[] = [
    {
      id: '1',
      question: 'Test MCQ',
      type: 'MCQ',
      difficulty: 'medium',
      choices: ['A', 'B'],
      correct_index: 0
    }
  ];

  it('sollte den Button zum Anzeigen der Antwort rendern, wenn MCQ vorhanden ist', () => {
    render(<QuestionsList questions={mockQuestions} />);
    
    const button = screen.getByText(/Richtige Antwort anzeigen/i);
    expect(button).toBeInTheDocument();
  });

  it('sollte den Text des Buttons nach Klick ändern', () => {
    render(<QuestionsList questions={mockQuestions} />);
    
    const button = screen.getByText(/Richtige Antwort anzeigen/i);
    fireEvent.click(button);
    
    expect(screen.getByText(/Antwort ausblenden/i)).toBeInTheDocument();
  });

  it('sollte nichts rendern (null), wenn die Fragen-Liste leer ist', () => {
    const { container } = render(<QuestionsList questions={[]} />);
    // container.firstChild ist null, wenn die Komponente bei [] nichts zurückgibt
    expect(container.firstChild).toBeNull();
  });
});