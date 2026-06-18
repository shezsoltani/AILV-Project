// src/components/EditableQuestionCard.tsx
// Einzelne Frage-Karte, die bearbeitet werden kann

import React, { useState, useEffect, useRef } from 'react';
import type { GeneratedQuestion } from '../../types/generatedQuestion';
import { getQuestionTypeLabel } from '../../constants/formConstants';

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

  // Antwortmöglichkeiten für SCQ/MCQ/TRUE_FALSE bearbeiten
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

  // SCQ/TRUE_FALSE: Setzt correct_index auf den gewählten Index
  const handleCorrectIndexChange = (index: number) => {
    if (readOnly || !onQuestionChange) return;
    const updated = { ...localQuestion, correct_index: index };
    setLocalQuestion(updated);
    onQuestionChange(updated);
  };

  // MCQ: Toggelt einen Index in correct_indices (an/aus); mindestens 1 muss markiert bleiben
  const handleCorrectIndicesToggle = (index: number) => {
    if (readOnly || !onQuestionChange) return;
    const currentIndices = localQuestion.correct_indices ?? [];
    const isSelected = currentIndices.includes(index);
    if (isSelected && currentIndices.length <= 1) {
      return;
    }
    const updatedIndices = isSelected
      ? currentIndices.filter((i) => i !== index)
      : [...currentIndices, index].sort((a, b) => a - b);
    const updated = { ...localQuestion, correct_indices: updatedIndices };
    setLocalQuestion(updated);
    onQuestionChange(updated);
  };

  // Erwartete Antwort für Kurzantwort-Fragen bearbeiten
  const handleAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (readOnly || !onQuestionChange) return;
    const updated = { ...localQuestion, answer: e.target.value };
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
  }, [localQuestion.choices, localQuestion.answer]);

  // Hilfsfunktionen zur Typbestimmung
  const isSCQ = localQuestion.type === 'SCQ' || localQuestion.type === 'TRUE_FALSE';
  const isMCQ = localQuestion.type === 'MCQ';
  const hasChoices = (isSCQ || isMCQ) && localQuestion.choices && localQuestion.choices.length > 0;

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

      {/* Antwortmöglichkeiten für SCQ, MCQ und TRUE_FALSE */}
      {hasChoices && (
        <div className="question-choices-container">
          {isMCQ ? (
            /* MCQ: Mehrere Antworten können als korrekt markiert werden (Checkboxen) */
            <>
              <label className="question-choices-label">
                Antwortmöglichkeiten:
                {showCorrectAnswer && (
                  <span className="question-choices-hint"> (Mehrere Antworten können korrekt sein)</span>
                )}
              </label>
              {localQuestion.choices!.map((choice, index) => {
                const isCorrect =
                  showCorrectAnswer &&
                  (localQuestion.correct_indices ?? []).includes(index);
                return (
                  <div key={`${localQuestion.id}-choice-${index}`} className="question-choice-item">
                    <div className="question-choice-selector">
                      {/* Checkbox-Indikator für korrekte Antwort */}
                      {showCorrectAnswer && (
                        <button
                          type="button"
                          aria-label={isCorrect ? 'Als korrekt markiert' : 'Als korrekt markieren'}
                          title={isCorrect ? 'Korrekte Antwort – klicken zum Entfernen' : 'Als korrekte Antwort markieren'}
                          className={`question-correct-toggle question-correct-toggle--checkbox ${isCorrect ? 'question-correct-toggle--active' : ''}`}
                          onClick={() => !readOnly && handleCorrectIndicesToggle(index)}
                          disabled={readOnly}
                        >
                          {isCorrect ? '☑' : '☐'}
                        </button>
                      )}
                      <label
                        htmlFor={`choice-${localQuestion.id}-${index}`}
                        className="question-choice-label"
                      >
                        {String.fromCharCode(65 + index)})
                      </label>
                    </div>
                    <div className="question-choice-content">
                      <textarea
                        ref={(el) => {
                          const key = `choice-${localQuestion.id}-${index}`;
                          textareaRefs.current[key] = el;
                          if (el) adjustTextareaHeight(el);
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
            </>
          ) : (
            /* SCQ / TRUE_FALSE: Genau 1 Antwort ist korrekt (Radio-ähnliche Auswahl) */
            <>
              <label className="question-choices-label">Antwortmöglichkeiten:</label>
              {localQuestion.choices!.map((choice, index) => {
                const isCorrect = showCorrectAnswer && localQuestion.correct_index === index;
                return (
                  <div key={`${localQuestion.id}-choice-${index}`} className="question-choice-item">
                    <div className="question-choice-selector">
                      {/* Radio-Indikator für die einzig korrekte Antwort */}
                      {showCorrectAnswer && (
                        <button
                          type="button"
                          aria-label={isCorrect ? 'Korrekte Antwort' : 'Als korrekte Antwort setzen'}
                          title={isCorrect ? 'Korrekte Antwort' : 'Als einzig korrekte Antwort setzen'}
                          className={`question-correct-toggle question-correct-toggle--radio ${isCorrect ? 'question-correct-toggle--active' : ''}`}
                          onClick={() => !readOnly && handleCorrectIndexChange(index)}
                          disabled={readOnly}
                        >
                          {isCorrect ? '◉' : '○'}
                        </button>
                      )}
                      <label
                        htmlFor={`choice-${localQuestion.id}-${index}`}
                        className="question-choice-label"
                      >
                        {String.fromCharCode(65 + index)})
                      </label>
                    </div>
                    <div className="question-choice-content">
                      <textarea
                        ref={(el) => {
                          const key = `choice-${localQuestion.id}-${index}`;
                          textareaRefs.current[key] = el;
                          if (el) adjustTextareaHeight(el);
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
            </>
          )}
        </div>
      )}

      {/* Bei Kurzantwort-Fragen die erwartete Antwort anzeigen */}
      {localQuestion.type === 'SHORT_ANSWER' && (
        <div className="question-answer-container">
          <label
            htmlFor={`answer-${localQuestion.id}`}
            className="question-answer-label"
          >
            Erwartete Antwort:
          </label>
          <textarea
            ref={(el) => {
              const key = `answer-${localQuestion.id}`;
              textareaRefs.current[key] = el;
              if (el) adjustTextareaHeight(el);
            }}
            id={`answer-${localQuestion.id}`}
            value={localQuestion.answer || ''}
            onChange={(e) => {
              if (!readOnly) {
                adjustTextareaHeight(e.target);
                handleAnswerChange(e);
              }
            }}
            readOnly={readOnly}
            className="question-answer-input"
            placeholder="Erwartete Antwort eingeben..."
            rows={2}
          />
        </div>
      )}
    </article>
  );
};
