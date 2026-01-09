// src/components/QuestionsList.tsx
// Container, der alle generierten Fragen anzeigt und verwaltet.
import React, { useState } from 'react';
import type { GeneratedQuestion } from '../types/generatedQuestion';
import { EditableQuestionCard } from './EditableQuestionCard';

// Definiert, welche Daten (Props) diese Komponente von außen erhält
interface QuestionsListProps {
  questions: GeneratedQuestion[]; // Array aller generierten Fragen
  onQuestionChange: (updatedQuestion: GeneratedQuestion) => void; // Callback bei Frageänderung
}

export const QuestionsList: React.FC<QuestionsListProps> = ({
  questions,
  onQuestionChange,
}) => {
  // State für die Anzeige der richtigen Antworten (nur bei MCQ-Fragen relevant)
  const [showCorrectAnswer, setShowCorrectAnswer] = useState<boolean>(false);

  // Wenn keine Fragen vorhanden sind, nichts anzeigen
  if (questions.length === 0) {
    return null;
  }

  return (
    <section className="questions-section">
      <p className="questions-description">
        Die Generierung der Prüfungsfragen ist abgeschlossen. Die Inhalte, Schwierigkeitsgrade und Antwortoptionen können nun überprüft, editiert und final gespeichert werden.
      </p>

      {/* Für jede Frage wird eine bearbeitbare Karte gerendert */}
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

      {/* Button nur anzeigen, wenn es mindestens eine MCQ-Frage mit richtiger Antwort gibt */}
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
