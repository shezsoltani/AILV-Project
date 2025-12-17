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

const getQuestionTypeLabel = (type: QuestionType): string => {
  switch (type) {
    case 'MCQ':
      return 'MCQ (Multiple Choice)';
    case 'SHORT_ANSWER':
      return 'Kurzantwort (Freitext)';
    case 'TRUE_FALSE':
      return 'Wahr/Falsch';
    default:
      return type;
  }
};

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
  isLoading?: boolean;
}

export const GenerateForm: React.FC<GenerateFormProps> = ({ onSubmit, isLoading = false }) => {
  const [formValues, setFormValues] =
    useState<GenerateRequestFormValues>(DEFAULT_FORM_VALUES);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [errors, setErrors] = useState<{
    topic?: string;
    difficulty?: string;
  }>({});

  const getDifficultyTotal = (values: GenerateRequestFormValues): number => {
    const { easy, medium, hard } = values.difficultyDistribution;

    const toNumber = (value: number | '' | undefined): number => {
      if (value === '' || value === undefined || Number.isNaN(Number(value))) {
        return 0;
      }
      return Number(value);
    };

    return toNumber(easy) + toNumber(medium) + toNumber(hard);
  };

  const validate = (values: GenerateRequestFormValues) => {
    const nextErrors: { topic?: string; difficulty?: string } = {};

    if (values.topic.trim().length < 3) {
      nextErrors.topic = 'Thema muss mindestens 3 Zeichen lang sein.';
    }

    const total = getDifficultyTotal(values);
    if (total !== 100) {
      nextErrors.difficulty =
        'Die Summe der Schwierigkeitsgrade (einfach + mittel + schwer) muss exakt 100% ergeben.';
    }

    return nextErrors;
  };

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;

    // 🔹 count: darf leer sein (''), sonst number
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

    // 🔹 difficultyDistribution: easy/medium/hard dürfen ebenfalls leer sein
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

    setFormValues((prev) => {
      const next: GenerateRequestFormValues = { ...prev, [name]: value } as GenerateRequestFormValues;
      setErrors(validate(next));
      return next;
    });
  };

  const handleLanguageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const language = event.target.value as Language;
    setFormValues((prev) => {
      const next: GenerateRequestFormValues = { ...prev, language };
      setErrors(validate(next));
      return next;
    });
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
