// src/components/EditableQuestionCard.tsx
import React, { useState, useEffect, useRef } from 'react';
import type { GeneratedQuestion } from '../types/generatedQuestion';

interface EditableQuestionCardProps {
  question: GeneratedQuestion;
  onQuestionChange: (updatedQuestion: GeneratedQuestion) => void;
  showCorrectAnswer?: boolean;
}

export const EditableQuestionCard: React.FC<EditableQuestionCardProps> = ({
  question,
  onQuestionChange,
  showCorrectAnswer = false,
}) => {
  const [localQuestion, setLocalQuestion] = useState<GeneratedQuestion>(question);

  // Lokalen State aktualisieren, wenn sich die Frage von außen ändert
  useEffect(() => {
    setLocalQuestion(question);
  }, [question]);

  // Änderungen sofort nach oben weitergeben
  const handleQuestionTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const updated = { ...localQuestion, question: e.target.value };
    setLocalQuestion(updated);
    onQuestionChange(updated);
  };

  const handleDifficultyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const updated = {
      ...localQuestion,
      difficulty: e.target.value as 'easy' | 'medium' | 'hard',
    };
    setLocalQuestion(updated);
    onQuestionChange(updated);
  };

  // Antwortmöglichkeiten für Multiple-Choice-Fragen bearbeiten
  const handleChoiceChange = (index: number, value: string) => {
    if (!localQuestion.choices) {
      return;
    }
    const updatedChoices = [...localQuestion.choices];
    updatedChoices[index] = value;
    const updated = { ...localQuestion, choices: updatedChoices };
    setLocalQuestion(updated);
    onQuestionChange(updated);
  };

  // Automatische Höhenanpassung für Textareas
  const textareaRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({});

  const adjustTextareaHeight = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  };

  useEffect(() => {
    // Höhe aller Textareas anpassen, wenn sich die Choices ändern
    Object.values(textareaRefs.current).forEach((textarea) => {
      if (textarea) {
        adjustTextareaHeight(textarea);
      }
    });
  }, [localQuestion.choices]);

  return (
    <article className="question-card">
      <header className="question-header">
        <span className="question-type">Typ: {localQuestion.type}</span>
        <select
          value={localQuestion.difficulty}
          onChange={handleDifficultyChange}
          className={`question-difficulty-select question-difficulty-${localQuestion.difficulty}`}
        >
          <option value="easy">Einfach</option>
          <option value="medium">Mittel</option>
          <option value="hard">Schwer</option>
        </select>
      </header>

      <div className="question-text-container">
        <label htmlFor={`question-text-${localQuestion.id}`} className="sr-only">
          Fragetext
        </label>
        <textarea
          id={`question-text-${localQuestion.id}`}
          value={localQuestion.question}
          onChange={handleQuestionTextChange}
          className="question-text-input"
          rows={3}
          placeholder="Frage eingeben..."
        />
      </div>

      {/* Nur bei Multiple-Choice-Fragen die Antwortmöglichkeiten anzeigen */}
      {localQuestion.type === 'MCQ' && localQuestion.choices && (
        <div className="question-choices-container">
          <label className="question-choices-label">Antwortmöglichkeiten:</label>
          {localQuestion.choices.map((choice, index) => {
            const isCorrect = showCorrectAnswer && localQuestion.correct_index === index;
            return (
              <div key={`${localQuestion.id}-choice-${index}`} className="question-choice-item">
                <label 
                  htmlFor={`choice-${localQuestion.id}-${index}`} 
                  className="question-choice-label"
                >
                  {index + 1}.
                </label>
                <div style={{ flex: 1, position: 'relative' }}>
                  <textarea
                    ref={(el) => {
                      const key = `choice-${localQuestion.id}-${index}`;
                      textareaRefs.current[key] = el;
                      if (el) {
                        adjustTextareaHeight(el);
                      }
                    }}
                    id={`choice-${localQuestion.id}-${index}`}
                    value={choice}
                    onChange={(e) => {
                      adjustTextareaHeight(e.target);
                      handleChoiceChange(index, e.target.value);
                    }}
                    className={`question-choice-input ${isCorrect ? 'question-choice-input--correct' : ''}`}
                    placeholder={`Antwortmöglichkeit ${index + 1}`}
                    rows={1}
                  />
                  {isCorrect && (
                    <span className="question-correct-badge">✓ Korrekt</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
};

