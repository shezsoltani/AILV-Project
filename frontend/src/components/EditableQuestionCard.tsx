// src/components/EditableQuestionCard.tsx
// Einzelne Frage-Karte, die bearbeitet werden kann

import React, { useState, useEffect, useRef } from 'react';
import type { GeneratedQuestion } from '../types/generatedQuestion';
import { getQuestionTypeLabel } from '../constants/formConstants';

// Interface für die Props dieser Komponente
interface EditableQuestionCardProps {
  question: GeneratedQuestion;
  questionNumber?: number;
  totalQuestions?: number;
  onQuestionChange?: (updatedQuestion: GeneratedQuestion) => void;
  showCorrectAnswer?: boolean;
  readOnly?: boolean;
}

export const EditableQuestionCard: React.FC<EditableQuestionCardProps> = ({
  question,
  questionNumber,
  totalQuestions,
  onQuestionChange,
  showCorrectAnswer = false,
  readOnly = false,
}) => {
  const [localQuestion, setLocalQuestion] = useState<GeneratedQuestion>(question);

  // Lokalen State aktualisieren, wenn sich die Frage von außen ändert
  useEffect(() => {
    setLocalQuestion(question);
  }, [question]);

  // Änderungen sofort nach oben weitergeben
  const handleQuestionTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (readOnly || !onQuestionChange) return;
    const updated = { ...localQuestion, question: e.target.value };
    setLocalQuestion(updated);
    onQuestionChange(updated);
  };

  // Schwierigkeitsgrad ändern
  const handleDifficultyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (readOnly || !onQuestionChange) return;
    const updated = {
      ...localQuestion,
      difficulty: e.target.value as 'easy' | 'medium' | 'hard',
    };
    setLocalQuestion(updated);
    onQuestionChange(updated);
  };

  // Antwortmöglichkeiten für Multiple-Choice-Fragen bearbeiten
  const handleChoiceChange = (index: number, value: string) => {
    if (readOnly || !onQuestionChange || !localQuestion.choices) {
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
      {/* Header zeigt Fragetyp, Schwierigkeitsgrad und Fragenzähler */}
      <header className="question-header">
        <div className="question-header-left">
          <span className="question-type-badge">{getQuestionTypeLabel(localQuestion.type)}</span>
          <select
            value={localQuestion.difficulty}
            onChange={handleDifficultyChange}
            disabled={readOnly}
            className={`question-difficulty-select question-difficulty-${localQuestion.difficulty}`}
          >
            <option value="easy">Einfach</option>
            <option value="medium">Mittel</option>
            <option value="hard">Schwer</option>
          </select>
        </div>
        {questionNumber && totalQuestions && (
          <span className="question-number">
            Frage {questionNumber} von {totalQuestions}
          </span>
        )}
      </header>

      <div className="question-text-container">
        <label htmlFor={`question-text-${localQuestion.id}`} className="sr-only">
          Fragetext
        </label>
        <textarea
          id={`question-text-${localQuestion.id}`}
          value={localQuestion.question}
          onChange={handleQuestionTextChange}
          readOnly={readOnly}
          className="question-text-input"
          rows={3}
          placeholder="Frage eingeben..."
        />
      </div>

      {/* Nur bei Multiple-Choice-Fragen die Antwortmöglichkeiten anzeigen */}
      {localQuestion.type === 'MCQ' && localQuestion.choices && (
        <div className="question-choices-container">
          <label className="question-choices-label">Antwortmöglichkeiten:</label>
          {/* Für jede Antwortmöglichkeit eine Textarea - richtige Antwort wird grün markiert */}
          {localQuestion.choices.map((choice, index) => {
            const isCorrect = showCorrectAnswer && localQuestion.correct_index === index;
            return (
              <div key={`${localQuestion.id}-choice-${index}`} className="question-choice-item">
                <label 
                  htmlFor={`choice-${localQuestion.id}-${index}`} 
                  className="question-choice-label"
                >
                  {String.fromCharCode(65 + index)})
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
                      if (!readOnly) {
                        adjustTextareaHeight(e.target);
                        handleChoiceChange(index, e.target.value);
                      }
                    }}
                    readOnly={readOnly}
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

