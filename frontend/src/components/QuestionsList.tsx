// src/components/QuestionsList.tsx
import React from 'react';
import type { GeneratedQuestion } from '../types/generatedQuestion';

interface QuestionsListProps {
  questions: GeneratedQuestion[];
}

export const QuestionsList: React.FC<QuestionsListProps> = ({ questions }) => {
  if (questions.length === 0) {
    return null;
  }

  return (
    <section className="questions-section">
      <h2 className="questions-title">Generierte Prüfungsfragen (Mock)</h2>
      <p className="questions-description">
        Dies ist eine Vorschau der von der KI generierten Fragen (Mock-Daten).
      </p>

      <div className="questions-list">
        {questions.map((q, idx) => (
          <article key={`${q.question}-${idx}`} className="question-card">
            <header className="question-header">
              <span className="question-type">Typ: {q.type}</span>
              <span
                className={`question-difficulty question-difficulty-${q.difficulty}`}
              >
                {q.difficulty === 'easy' && 'Einfach'}
                {q.difficulty === 'medium' && 'Mittel'}
                {q.difficulty === 'hard' && 'Schwer'}
              </span>
            </header>

            <p className="question-text">{q.question}</p>
          </article>
        ))}
      </div>
    </section>
  );
};
