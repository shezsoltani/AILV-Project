// src/components/GenerateForm.tsx
// Eingabeformular für die Generierung von Prüfungsfragen

import React from 'react';
import type { GenerateRequestFormValues } from '../types/generate';
import {
  QUESTION_TYPE_OPTIONS,
  getQuestionTypeLabel,
} from '../constants/formConstants';
import { useGenerateForm } from '../hooks/useGenerateForm';

interface GenerateFormProps {
  onSubmit?: (values: GenerateRequestFormValues) => void;
  isLoading?: boolean;
}

export const GenerateForm: React.FC<GenerateFormProps> = ({ onSubmit, isLoading = false }) => {
  // Hook verwaltet alle Formular-Logik: Eingaben, Validierung, Submit
  const {
    formValues,
    displayValues,
    errors,
    showSuccessMessage,
    isLoading: formIsLoading,
    handleInputChange,
    handleBlur,
    handleKeyDown,
    handleLanguageChange,
    handleTypeToggle,
    handleSubmit,
  } = useGenerateForm({ onSubmit, isLoading });

  return (
    <div className="card">
      <form className="form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label className="form-label" htmlFor="topic">
            Thema *
          </label>
          <input
            // Input-Feld für das Thema der Fragen
            id="topic"
            name="topic"
            className={`form-input${errors.topic ? ' form-input--error' : ''}`}
            type="text"
            placeholder="Einführung in Algorithmen"
            value={formValues.topic}
            onChange={handleInputChange}
            required
          />
          {errors.topic && (
            <p className="form-error-message">{errors.topic}</p>
          )}
        </div>

        <div className="form-row">
          {/* Dropdown-Menü für die Sprache der Fragen */}
          <label className="form-label" htmlFor="language">
            Sprache
          </label>
          <select
            id="language"
            name="language"
            className="form-input"
            value={formValues.language}
            onChange={handleLanguageChange}
          >
            <option value="de">Deutsch (de)</option>
            <option value="en">Englisch (en)</option>
          </select>
        </div>

        {/* Eingabefeld für die Anzahl der Fragen */}
        <div className="form-row">
          <label className="form-label" htmlFor="count">
            Anzahl Fragen
          </label>
          <div className="form-input-wrapper form-input-wrapper--numeric">
            <input
              id="count"
              name="count"
              className={`form-input${errors.count ? ' form-input--error' : ''}`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={displayValues.count}
              onChange={handleInputChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
            />
          </div>
          {errors.count && (
            <p className="form-error-message">{errors.count}</p>
          )}
        </div>

        <div className="form-row">
          <p className="form-section-title">Fragetypen</p>
          <p className="form-helper" style={{ marginBottom: '1rem', fontStyle: 'normal' }}>
            Wählen Sie einen oder mehrere Fragetypen aus, die generiert werden sollen. 
            Sie können mehrere Optionen gleichzeitig auswählen.
          </p>
          {/* Checkboxen für alle verfügbaren Fragetypen - mehrere können ausgewählt werden */}
          <div className="checkbox-group">
            {QUESTION_TYPE_OPTIONS.map((type) => (
              <label 
                key={type} 
                className={`form-label checkbox-label ${formValues.types.includes(type) ? 'checkbox-label--checked' : ''}`}
              >
                <input
                  type="checkbox"
                  className="form-input"
                  checked={formValues.types.includes(type)}
                  onChange={() => handleTypeToggle(type)}
                />
                <span>{getQuestionTypeLabel(type)}</span>
              </label>
            ))}
          </div>
          {errors.types && (
            <p className="form-error-message">{errors.types}</p>
          )}
        </div>

        <div className="form-row">
          <p className="form-section-title">Schwierigkeitsverteilung (%)</p>
          {/* Drei Eingabefelder für die Prozent-Verteilung - Summe muss 100% ergeben */}
          <div className="form-group">
            <label className="form-label" htmlFor="difficulty-easy">
              Einfach (%)
            </label>
            <div className="form-input-wrapper form-input-wrapper--numeric">
              <input
                id="difficulty-easy"
                name="difficultyDistribution.easy"
                className={`form-input${
                  errors.difficultyEasy || errors.difficulty ? ' form-input--error' : ''
                }`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={displayValues.difficultyEasy}
                onChange={handleInputChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
              />
            </div>
            {errors.difficultyEasy && (
              <p className="form-error-message">{errors.difficultyEasy}</p>
            )}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="difficulty-medium">
              Mittel (%)
            </label>
            <div className="form-input-wrapper form-input-wrapper--numeric">
              <input
                id="difficulty-medium"
                name="difficultyDistribution.medium"
                className={`form-input${
                  errors.difficultyMedium || errors.difficulty ? ' form-input--error' : ''
                }`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={displayValues.difficultyMedium}
                onChange={handleInputChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
              />
            </div>
            {errors.difficultyMedium && (
              <p className="form-error-message">{errors.difficultyMedium}</p>
            )}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="difficulty-hard">
              Schwer (%)
            </label>
            <div className="form-input-wrapper form-input-wrapper--numeric">
              <input
                id="difficulty-hard"
                name="difficultyDistribution.hard"
                className={`form-input${
                  errors.difficultyHard || errors.difficulty ? ' form-input--error' : ''
                }`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={displayValues.difficultyHard}
                onChange={handleInputChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
              />
            </div>
            {errors.difficultyHard && (
              <p className="form-error-message">{errors.difficultyHard}</p>
            )}
          </div>
          <p className="form-helper">
            Die Summe aus Einfach, Mittel und Schwer muss 100% ergeben.
          </p>
          {errors.difficulty && (
            <p className="form-error-message">{errors.difficulty}</p>
          )}
        </div>

        {/* Button ist deaktiviert, wenn gerade geladen wird oder Fehler vorhanden sind */}
        <button 
          type="submit" 
          className="primary-button form-submit-button"
          disabled={formIsLoading || Object.keys(errors).length > 0}
        >
          {formIsLoading ? 'Wird generiert...' : 'Fragen generieren'}
        </button>
      </form>
      {showSuccessMessage && (
        <p className="form-success-message">Formulardaten erfasst</p>
      )}
    </div>
  );
};
