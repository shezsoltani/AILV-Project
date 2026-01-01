// src/components/EditableQuestionCard.tsx
import React, { useState, useEffect } from 'react';
import type { GeneratedQuestion } from '../types/generatedQuestion';

interface EditableQuestionCardProps {
  question: GeneratedQuestion;
  onQuestionChange: (updatedQuestion: GeneratedQuestion) => void;
}

export const EditableQuestionCard: React.FC<EditableQuestionCardProps> = ({
  question,
  onQuestionChange,
}) => {
  const [localQuestion, setLocalQuestion] = useState<GeneratedQuestion>(question);

  // Aktualisiere lokalen State, wenn question-Prop sich ändert
  useEffect(() => {
    setLocalQuestion(question);
  }, [question]);

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

      {localQuestion.type === 'MCQ' && localQuestion.choices && (
        <div className="question-choices-container">
          <label className="question-choices-label">Antwortmöglichkeiten:</label>
          {localQuestion.choices.map((choice, index) => (
            <div key={index} className="question-choice-item">
              <label 
                htmlFor={`choice-${localQuestion.id}-${index}`} 
                className="question-choice-label"
              >
                {index + 1}.
              </label>
              <input
                id={`choice-${localQuestion.id}-${index}`}
                type="text"
                value={choice}
                onChange={(e) => handleChoiceChange(index, e.target.value)}
                className="question-choice-input"
                placeholder={`Antwortmöglichkeit ${index + 1}`}
              />
            </div>
          ))}
        </div>
      )}
    </article>
  );
};

