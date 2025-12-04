import { FormEvent, useState, ChangeEvent } from 'react';
import {
  GenerateRequestFormValues,
  Language,
  QuestionType,
} from '../types/generate';

const QUESTION_TYPE_OPTIONS: QuestionType[] = [
  'MCQ',
  'SHORT_ANSWER',
  'TRUE_FALSE',
];

const DEFAULT_FORM_VALUES: GenerateRequestFormValues = {
  topic: '',
  language: 'de',
  count: 5,
  types: ['MCQ'],
  difficultyDistribution: {
    easy: 40,
    medium: 40,
    hard: 20,
  },
};

interface GenerateFormProps {
  onSubmit?: (values: GenerateRequestFormValues) => void;
}

export const GenerateForm: React.FC<GenerateFormProps> = ({ onSubmit }) => {
  const [formValues, setFormValues] =
    useState<GenerateRequestFormValues>(DEFAULT_FORM_VALUES);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;

    // 🔹 count: darf leer sein (''), sonst number
    if (name === 'count') {
      const raw = value;
      setFormValues((prev) => ({
        ...prev,
        count: raw === '' ? '' : Number(raw),
      }));
      return;
    }

    // 🔹 difficultyDistribution: easy/medium/hard dürfen ebenfalls leer sein
    if (name.startsWith('difficultyDistribution.')) {
      const key =
        name.split('.')[1] as keyof GenerateRequestFormValues['difficultyDistribution'];
      const raw = value;
      setFormValues((prev) => ({
        ...prev,
        difficultyDistribution: {
          ...prev.difficultyDistribution,
          [key]: raw === '' ? '' : Number(raw),
        },
      }));
      return;
    }

    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleLanguageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const language = event.target.value as Language;
    setFormValues((prev) => ({ ...prev, language }));
  };

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
    console.log('GenerateRequest form values:', formValues);
    setShowSuccessMessage(true);
    
    if (onSubmit) {
      onSubmit(formValues);
    }
  };

  return (
    <div>
      <form className="form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label className="form-label" htmlFor="topic">
            Thema *
          </label>
          <input
            id="topic"
            name="topic"
            className="form-input"
            type="text"
            placeholder="Einführung in Algorithmen"
            value={formValues.topic}
            onChange={handleInputChange}
            required
          />
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
          <div className="checkbox-group">
            {QUESTION_TYPE_OPTIONS.map((type) => (
              <label key={type} className="form-label">
                <input
                  type="checkbox"
                  className="form-input"
                  checked={formValues.types.includes(type)}
                  onChange={() => handleTypeToggle(type)}
                />
                {type}
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
              className="form-input"
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
              className="form-input"
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
              className="form-input"
              type="number"
              min={0}
              max={100}
              value={formValues.difficultyDistribution.hard}
              onChange={handleInputChange}
            />
          </div>
          <p className="form-helper">
            Achte darauf, dass die Summe idealerweise 100% ergibt.
          </p>
        </div>

        <button type="submit" className="primary-button form-submit-button">
          Fragen generieren
        </button>
      </form>
      {showSuccessMessage && (
        <p className="form-success-message">Formulardaten erfasst</p>
      )}
    </div>
  );
};
