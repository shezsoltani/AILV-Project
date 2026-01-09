// src/hooks/useGenerateForm.ts
// Verwaltet Formular-State, Validierung und Eingabeverarbeitung

import { useState, FormEvent, ChangeEvent } from 'react';
import type {
  GenerateRequestFormValues,
  Language,
  QuestionType,
} from '../types/generate';
import { DEFAULT_FORM_VALUES } from '../constants/formConstants';
import { validate, type ValidationErrors } from '../validators/generateValidator';
import { sanitizeToDigitsOnly } from '../utils/inputSanitizer';

interface UseGenerateFormProps {
  onSubmit?: (values: GenerateRequestFormValues) => void;
  isLoading?: boolean;
}

interface UseGenerateFormReturn {
  formValues: GenerateRequestFormValues;
  // String-Werte für Eingabefelder (separat von formValues für Anzeige während Eingabe)
  displayValues: {
    count: string;
    difficultyEasy: string;
    difficultyMedium: string;
    difficultyHard: string;
  };
  errors: ValidationErrors;
  showSuccessMessage: boolean;
  isLoading: boolean;
  handleInputChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  // Wird aufgerufen, wenn Benutzer ein Eingabefeld verlässt
  handleBlur: (event: React.FocusEvent<HTMLInputElement>) => void;
  // Pfeiltasten-Handler für Zahlenfelder (↑/↓)
  handleKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  handleLanguageChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  // Toggelt Fragetyp (hinzufügen/entfernen)
  handleTypeToggle: (type: QuestionType) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export const useGenerateForm = ({
  onSubmit,
  isLoading = false,
}: UseGenerateFormProps): UseGenerateFormReturn => {
  // Formularwerte (typisiert: Zahlen als Zahlen, Strings als Strings)
  const [formValues, setFormValues] =
    useState<GenerateRequestFormValues>(DEFAULT_FORM_VALUES);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const [displayValues, setDisplayValues] = useState({
    count: String(DEFAULT_FORM_VALUES.count),
    difficultyEasy: String(DEFAULT_FORM_VALUES.difficultyDistribution.easy),
    difficultyMedium: String(DEFAULT_FORM_VALUES.difficultyDistribution.medium),
    difficultyHard: String(DEFAULT_FORM_VALUES.difficultyDistribution.hard),
  });

  // Aktualisiert formValues und validiert sofort
  const updateFormValues = (updater: (prev: GenerateRequestFormValues) => GenerateRequestFormValues) => {
    setFormValues((prev) => {
      const next = updater(prev);
      setErrors(validate(next));
      return next;
    });
  };

  // Verarbeitet Zahlenfelder (count und difficultyDistribution)
  const handleNumericField = (name: string, value: string) => {
    const cleanedValue = sanitizeToDigitsOnly(value);
    
    if (name === 'count') {
      setDisplayValues((prev) => ({ ...prev, count: cleanedValue }));
      if (cleanedValue === '') {
        updateFormValues((prev) => ({ ...prev, count: '' }));
      } else {
        const numValue = Number(cleanedValue);
        if (!Number.isNaN(numValue)) {
          updateFormValues((prev) => ({ ...prev, count: numValue }));
        }
      }
      return true;
    }

    if (name.startsWith('difficultyDistribution.')) {
      const key = name.split('.')[1] as 'easy' | 'medium' | 'hard';
      const displayKey = `difficulty${key.charAt(0).toUpperCase() + key.slice(1)}` as
        | 'difficultyEasy'
        | 'difficultyMedium'
        | 'difficultyHard';

      setDisplayValues((prev) => ({ ...prev, [displayKey]: cleanedValue }));
      if (cleanedValue === '') {
        updateFormValues((prev) => ({
          ...prev,
          difficultyDistribution: {
            ...prev.difficultyDistribution,
            [key]: '',
          },
        }));
      } else {
        const numValue = Number(cleanedValue);
        if (!Number.isNaN(numValue)) {
          updateFormValues((prev) => ({
            ...prev,
            difficultyDistribution: {
              ...prev.difficultyDistribution,
              [key]: numValue,
            },
          }));
        }
      }
      return true;
    }

    return false;
  };

  // Verarbeitet Eingaben, bereinigt und validiert sofort
  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;

    // Zahlenfelder (count, difficultyDistribution)
    if (handleNumericField(name, value)) {
      return;
    }

    // Thema-Feld
    if (name === 'topic') {
      updateFormValues((prev) => ({ ...prev, topic: value }));
      return;
    }

    console.warn(`Unbekanntes Formularfeld: ${name}`);
  };

  // Zusätzliche Validierung beim Verlassen des Feldes
  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    
    // Bei leeren Zahlenfeldern nochmal validieren
    if (value === '' && (name === 'count' || name.startsWith('difficultyDistribution.'))) {
      handleNumericField(name, value);
    }
  };

  // Pfeiltasten-Handler für Zahlenfelder (↑ erhöht, ↓ verringert)
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const { name, value } = event.target as HTMLInputElement;
    
    // Nur bei Zahlenfeldern und Pfeiltasten reagieren
    if ((name === 'count' || name.startsWith('difficultyDistribution.')) && 
        (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault();
      
      // Aktuellen Wert als Zahl parsen
      const currentValue = value === '' ? 0 : Number(value);
      if (Number.isNaN(currentValue)) {
        return;
      }

      // Schrittweite: 1 für count, 1 für difficulty
      const step = 1;
      let newValue: number;

      if (event.key === 'ArrowUp') {
        newValue = currentValue + step;
      } else {
        newValue = Math.max(0, currentValue - step);
      }

      // Grenzen setzen
      if (name === 'count') {
        newValue = Math.max(1, Math.min(50, newValue));
      } else {
        // difficulty: 0-100
        newValue = Math.max(0, Math.min(100, newValue));
      }

      // Wert aktualisieren
      const newValueString = String(newValue);
      handleNumericField(name, newValueString);
    }
  };

  // Ändert Sprache
  const handleLanguageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const language = event.target.value as Language;
    updateFormValues((prev) => ({ ...prev, language }));
  };

  // Toggelt Fragetyp (mehrfach auswählbar)
  const handleTypeToggle = (type: QuestionType) => {
    updateFormValues((prev) => {
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

  // Validiert Formular und ruft onSubmit auf, wenn gültig
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationErrors = validate(formValues);
    setErrors(validationErrors);

    // Bei Fehlern nicht absenden
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

  return {
    formValues,
    displayValues,
    errors,
    showSuccessMessage,
    isLoading,
    handleInputChange,
    handleBlur,
    handleKeyDown,
    handleLanguageChange,
    handleTypeToggle,
    handleSubmit,
  };
};
