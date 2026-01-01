// src/components/QuestionsList.tsx
import React from 'react';
import type { GeneratedQuestion } from '../types/generatedQuestion';
import { EditableQuestionCard } from './EditableQuestionCard';

interface QuestionsListProps {
  questions: GeneratedQuestion[];
  onQuestionChange: (updatedQuestion: GeneratedQuestion) => void;
  onFinalize: () => void;
}

export const QuestionsList: React.FC<QuestionsListProps> = ({
  questions,
  onQuestionChange,
  onFinalize,
}) => {
  if (questions.length === 0) {
    return null;
  }

  return (
    <section className="questions-section">
      <p className="questions-description">
        Die KI hat die Struktur der Prüfungsfragen generiert (Typ und Schwierigkeitsgrad). Der eigentliche Frage-Text wird in einem späteren Schritt erzeugt.
      </p>

      <div className="questions-list">
        {questions.map((q) => (
          <EditableQuestionCard
            key={q.id}
            question={q}
            onQuestionChange={onQuestionChange}
          />
        ))}
      </div>
    </section>
  );
};
