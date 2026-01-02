import React, { FormEvent, useState, ChangeEvent } from 'react';
import type {
  GenerateRequestFormValues,
  Language,
  QuestionType,
} from '../types/generate';
import {
  QUESTION_TYPE_OPTIONS,
  DEFAULT_FORM_VALUES,
  getQuestionTypeLabel,
} from '../constants/formConstants';
import { validate, type ValidationErrors } from '../validators/generateValidator';

interface GenerateFormProps {
  onSubmit?: (values: GenerateRequestFormValues) => void;
  isLoading?: boolean;
}

export const GenerateForm: React.FC<GenerateFormProps> = ({ onSubmit, isLoading = false }) => {
  const [formValues, setFormValues] =
    useState<GenerateRequestFormValues>(DEFAULT_FORM_VALUES);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;

    // Anzahl-Feld: leer lassen erlaubt, sonst als Zahl speichern
    if (name === 'count') {
      const raw = value;
      setFormValues((prev) => {
        const next: GenerateRequestFormValues = {
        ...prev,
        count: raw === '' ? '' : Number(raw),
        };
        setErrors(validate(next));
        return next;
      });
      return;
    }

    // Schwierigkeitsverteilung: auch hier dürfen Felder leer bleiben
    if (name.startsWith('difficultyDistribution.')) {
      const key =
        name.split('.')[1] as keyof GenerateRequestFormValues['difficultyDistribution'];
      const raw = value;
      setFormValues((prev) => {
        const next: GenerateRequestFormValues = {
        ...prev,
        difficultyDistribution: {
          ...prev.difficultyDistribution,
          [key]: raw === '' ? '' : Number(raw),
        },
        };
        setErrors(validate(next));
        return next;
      });
      return;
    }

    // Nur für topic-Feld (String)
    if (name === 'topic') {
      setFormValues((prev) => {
        const next: GenerateRequestFormValues = { ...prev, topic: value };
        setErrors(validate(next));
        return next;
      });
      return;
    }

    // Fallback für unbekannte Felder (sollte nicht vorkommen)
    console.warn(`Unbekanntes Formularfeld: ${name}`);
  };

  const handleLanguageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const language = event.target.value as Language;
    setFormValues((prev) => {
      const next: GenerateRequestFormValues = { ...prev, language };
      setErrors(validate(next));
      return next;
    });
  };

  // Fragetypen können mehrfach ausgewählt werden
  const handleTypeToggle = (type: QuestionType) => {
    setFormValues((prev) => {
      const isSelected = prev.types.includes(type);
      const nextTypes = isSelected
        ? prev.types.filter((t) => t !== type)
        : [...prev.types, type];

      return {
        ...prev,
        types: nextTypes,
      };
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Formular validieren bevor es abgeschickt wird
    const validationErrors = validate(formValues);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setShowSuccessMessage(false);
      return;
    }

    console.log('GenerateRequest form values:', formValues);
    setShowSuccessMessage(true);

    if (onSubmit) {
      onSubmit(formValues);
    }
  };

  return (
    <div className="card">
      <form className="form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label className="form-label" htmlFor="topic">
            Thema *
          </label>
          <input
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

        <div className="form-row">
          <label className="form-label" htmlFor="count">
            Anzahl Fragen
          </label>
          <input
            id="count"
            name="count"
            className="form-input"
            type="number"
            min={1}
            max={50}
            value={formValues.count}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-row">
          <p className="form-section-title">Fragetypen</p>
          <p className="form-helper" style={{ marginBottom: '1rem', fontStyle: 'normal' }}>
            Wählen Sie einen oder mehrere Fragetypen aus, die generiert werden sollen. 
            Sie können mehrere Optionen gleichzeitig auswählen.
          </p>
          <div className="checkbox-group">
            {QUESTION_TYPE_OPTIONS.map((type) => (
              <label key={type} className="form-label">
                <input
                  type="checkbox"
                  className="form-input"
                  checked={formValues.types.includes(type)}
                  onChange={() => handleTypeToggle(type)}
                />
                {getQuestionTypeLabel(type)}
              </label>
            ))}
          </div>
        </div>

        <div className="form-row">
          <p className="form-section-title">Schwierigkeitsverteilung (%)</p>
          <div className="form-group">
            <label className="form-label" htmlFor="difficulty-easy">
              Einfach (%)
            </label>
            <input
              id="difficulty-easy"
              name="difficultyDistribution.easy"
              className={`form-input${
                errors.difficulty ? ' form-input--error' : ''
              }`}
              type="number"
              min={0}
              max={100}
              value={formValues.difficultyDistribution.easy}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="difficulty-medium">
              Mittel (%)
            </label>
            <input
              id="difficulty-medium"
              name="difficultyDistribution.medium"
              className={`form-input${
                errors.difficulty ? ' form-input--error' : ''
              }`}
              type="number"
              min={0}
              max={100}
              value={formValues.difficultyDistribution.medium}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="difficulty-hard">
              Schwer (%)
            </label>
            <input
              id="difficulty-hard"
              name="difficultyDistribution.hard"
              className={`form-input${
                errors.difficulty ? ' form-input--error' : ''
              }`}
              type="number"
              min={0}
              max={100}
              value={formValues.difficultyDistribution.hard}
              onChange={handleInputChange}
            />
          </div>
          <p className="form-helper">
            Die Summe aus Einfach, Mittel und Schwer muss 100% ergeben.
          </p>
          {errors.difficulty && (
            <p className="form-error-message">{errors.difficulty}</p>
          )}
        </div>

        <button 
          type="submit" 
          className="primary-button form-submit-button"
          disabled={isLoading}
        >
          {isLoading ? 'Wird generiert...' : 'Fragen generieren'}
        </button>
      </form>
      {showSuccessMessage && (
        <p className="form-success-message">Formulardaten erfasst</p>
      )}
    </div>
  );
};
