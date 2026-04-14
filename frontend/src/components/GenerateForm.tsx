// src/components/GenerateForm.tsx
// Darstellung des Generierungsformulars. Logik: useGenerateForm.

import React from 'react';
import type { GenerateRequestFormValues } from '../types/generate';
import {
  QUESTION_TYPE_OPTIONS,
  getQuestionTypeLabel,
} from '../constants/formConstants';
import { useGenerateForm } from '../hooks/useGenerateForm';
import { ErrorBanner } from './ErrorBanner';
import { PdfUpload } from './PdfUpload';

// Drei Felder für die Prozent-Verteilung. Keys müssen zu useGenerateForm passen.
const DIFFICULTY_FIELDS = [
  { id: 'difficulty-easy',   name: 'difficultyDistribution.easy',   label: 'Einfach (%)', displayKey: 'difficultyEasy'   as const, errorKey: 'difficultyEasy'   as const },
  { id: 'difficulty-medium', name: 'difficultyDistribution.medium', label: 'Mittel (%)',  displayKey: 'difficultyMedium' as const, errorKey: 'difficultyMedium' as const },
  { id: 'difficulty-hard',   name: 'difficultyDistribution.hard',   label: 'Schwer (%)', displayKey: 'difficultyHard'   as const, errorKey: 'difficultyHard'   as const },
] as const;

interface GenerateFormProps {
  onSubmit?: (values: GenerateRequestFormValues) => void;
  isLoading?: boolean;
  submitError?: string | null;
}

export const GenerateForm: React.FC<GenerateFormProps> = ({
  onSubmit,
  isLoading = false,
  submitError = null,
}) => {
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
    setUploadContext,
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
          <p className="form-section-title">Manueller Kontext</p>
          {/* Optionales Textfeld für manuellen Kontext – wird als context_text an die API übergeben */}
          <label className="form-label" htmlFor="contextText">
            Zusätzlicher Text (optional)
          </label>
          <textarea
            id="contextText"
            name="contextText"
            className="form-input"
            placeholder="Fügen Sie hier relevante Hintergrundinformationen ein …"
            rows={4}
            value={formValues.contextText ?? ''}
            onChange={handleInputChange}
          />
          <p className="form-helper">
            Ergänzende Informationen, die zusätzlich zum PDF (oder stattdessen) bei der Fragengenerierung berücksichtigt werden sollen.
          </p>
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
          {DIFFICULTY_FIELDS.map(({ id, name, label, displayKey, errorKey }) => (
            <div className="form-group" key={id}>
              <label className="form-label" htmlFor={id}>
                {label}
              </label>
              <div className="form-input-wrapper form-input-wrapper--numeric">
                <input
                  id={id}
                  name={name}
                  className={`form-input${
                    errors[errorKey] || errors.difficulty ? ' form-input--error' : ''
                  }`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={displayValues[displayKey]}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                />
              </div>
              {errors[errorKey] && (
                <p className="form-error-message">{errors[errorKey]}</p>
              )}
            </div>
          ))}
          <p className="form-helper">
            Die Summe aus Einfach, Mittel und Schwer muss 100% ergeben.
          </p>
          {errors.difficulty && (
            <p className="form-error-message">{errors.difficulty}</p>
          )}
        </div>

        {/* === START: UPLOAD-BEREICH FÜR PDF === */}
        <div className="form-row" style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
          <p className="form-section-title" style={{ marginTop: 0 }}>Dokumenten-Kontext (PDF)</p>
          <PdfUpload onExtractedText={setUploadContext} />
          
          {formValues.uploadContext && (
            <div style={{ marginTop: '1rem' }}>
              <label className="form-label">Extrahierter Text bereit für die Generierung</label>
              <textarea
                className="form-input"
                readOnly
                rows={5}
                value={formValues.uploadContext}
                style={{ backgroundColor: '#edf2f7', color: '#4a5568', cursor: 'not-allowed' }}
              />
              <button
                type="button"
                className="primary-button"
                style={{ marginTop: '1rem', backgroundColor: '#e53e3e' }}
                onClick={() => setUploadContext(undefined)}
              >
                PDF-Kontext entfernen
              </button>
            </div>
          )}
        </div>
        {/* === ENDE: UPLOAD-BEREICH === */}

        {/* Button ist deaktiviert, wenn gerade geladen wird oder Fehler vorhanden sind */}
        <button 
          type="submit" 
          className="primary-button form-submit-button"
          disabled={formIsLoading || Object.keys(errors).length > 0}
        >
          {formIsLoading ? 'Wird generiert...' : 'Fragen generieren'}
        </button>

        <ErrorBanner message={submitError} style={{ marginTop: '1rem' }} />
      </form>
      {showSuccessMessage && !submitError && (
        <p className="form-success-message">Formulardaten erfasst</p>
      )}
    </div>
  );
};
