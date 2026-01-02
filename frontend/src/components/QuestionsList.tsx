// src/components/QuestionsList.tsx
import React, { useState } from 'react';
import type { GeneratedQuestion } from '../types/generatedQuestion';
import { EditableQuestionCard } from './EditableQuestionCard';

interface QuestionsListProps {
  questions: GeneratedQuestion[];
  onQuestionChange: (updatedQuestion: GeneratedQuestion) => void;
}

export const QuestionsList: React.FC<QuestionsListProps> = ({
  questions,
  onQuestionChange,
}) => {
  const [showCorrectAnswer, setShowCorrectAnswer] = useState<boolean>(false);

  if (questions.length === 0) {
    return null;
  }

  return (
    <section className="questions-section">
      <p className="questions-description">
        Die Generierung der Prüfungsfragen ist abgeschlossen. Die Inhalte, Schwierigkeitsgrade und Antwortoptionen können nun überprüft, editiert und final gespeichert werden.
      </p>

      <div className="questions-list">
        {questions.map((q) => (
          <EditableQuestionCard
            key={q.id}
            question={q}
            onQuestionChange={onQuestionChange}
            showCorrectAnswer={showCorrectAnswer}
          />
        ))}
      </div>

      {questions.some((q) => q.type === 'MCQ' && q.correct_index !== undefined) && (
        <div style={{ marginTop: 'var(--spacing-lg)', textAlign: 'center' }}>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setShowCorrectAnswer(!showCorrectAnswer)}
          >
            {showCorrectAnswer ? 'Antwort ausblenden' : 'Richtige Antwort anzeigen'}
          </button>
        </div>
      )}
    </section>
  );
};
