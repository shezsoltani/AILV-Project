// src/hooks/questions/useGenerateForm.ts
// Verwaltet Formularzustand, Validierung und KI-Modellauswahl.

import { useEffect, useState } from 'react';
import type {
  ChangeEvent,
  FocusEvent,
  FormEvent,
  KeyboardEvent,
} from 'react';

import type {
  GenerateRequestFormValues,
  Language,
  QuestionType,
} from '../../types/generate';

import { DEFAULT_FORM_VALUES } from '../../constants/formConstants';
import {
  validate,
  type ValidationErrors,
} from '../../validators/generateValidator';
import { sanitizeToDigitsOnly } from '../../utils/inputSanitizer';

import {
  getGenerationModels,
  type GenerationModel,
  type GenerationProvider,
} from '../../services/generationModelsApi';

interface UseGenerateFormProps {
  onSubmit?: (values: GenerateRequestFormValues) => void;
  isLoading?: boolean;
}

interface DisplayValues {
  count: string;
  difficultyEasy: string;
  difficultyMedium: string;
  difficultyHard: string;
}

type DifficultyKey = 'easy' | 'medium' | 'hard';

const DIFFICULTY_DISPLAY_KEYS = {
  easy: 'difficultyEasy',
  medium: 'difficultyMedium',
  hard: 'difficultyHard',
} as const;

function getDifficultyKey(name: string): DifficultyKey | null {
  switch (name) {
    case 'difficultyDistribution.easy':
      return 'easy';
    case 'difficultyDistribution.medium':
      return 'medium';
    case 'difficultyDistribution.hard':
      return 'hard';
    default:
      return null;
  }
}

export interface UseGenerateFormReturn {
  models: GenerationModel[];
  modelsLoading: boolean;
  modelsError: string | null;
  selectionError: string | null;
  selectionValid: boolean;

  reloadModels: () => void;
  setProvider: (provider: GenerationProvider) => void;
  setModel: (model: string) => void;

  formValues: GenerateRequestFormValues;
  displayValues: DisplayValues;
  errors: ValidationErrors;
  showSuccessMessage: boolean;
  isLoading: boolean;

  handleInputChange: (
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => void;

  handleBlur: (event: FocusEvent<HTMLInputElement>) => void;
  handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  handleLanguageChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  handleTypeToggle: (type: QuestionType) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  setUploadContext: (value: string | undefined) => void;
}

export const useGenerateForm = ({
  onSubmit,
  isLoading = false,
}: UseGenerateFormProps): UseGenerateFormReturn => {
  const [formValues, setFormValues] =
    useState<GenerateRequestFormValues>(() => ({
      ...DEFAULT_FORM_VALUES,
      types: [...DEFAULT_FORM_VALUES.types],
      difficultyDistribution: {
        ...DEFAULT_FORM_VALUES.difficultyDistribution,
      },
      provider: DEFAULT_FORM_VALUES.provider ?? 'openai',
      model: DEFAULT_FORM_VALUES.model ?? '',
    }));

  const [displayValues, setDisplayValues] = useState<DisplayValues>({
    count: String(DEFAULT_FORM_VALUES.count),
    difficultyEasy: String(DEFAULT_FORM_VALUES.difficultyDistribution.easy),
    difficultyMedium: String(DEFAULT_FORM_VALUES.difficultyDistribution.medium),
    difficultyHard: String(DEFAULT_FORM_VALUES.difficultyDistribution.hard),
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [validationStarted, setValidationStarted] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const [models, setModels] = useState<GenerationModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [modelsReload, setModelsReload] = useState(0);

  // Nach der ersten Eingabe werden Änderungen laufend validiert.
  // Der State-Updater selbst bleibt frei von weiteren State-Änderungen.
  useEffect(() => {
    if (validationStarted) {
      setErrors(validate(formValues));
    }
  }, [formValues, validationStarted]);

  // Optionen ausschließlich vom Backend laden.
  useEffect(() => {
    let cancelled = false;

    const loadModels = async (): Promise<void> => {
      setModelsLoading(true);
      setModelsError(null);
      setSelectionError(null);

      try {
        const response = await getGenerationModels();

        if (cancelled) return;

        const nextModels = response.models;

        setModels(nextModels);

        setFormValues((previous) => {
          const currentProvider = previous.provider ?? 'openai';

          const providerExists = nextModels.some(
            (entry) => entry.provider === currentProvider,
          );

          // Einen vorhandenen Anbieter bei erneuter Prüfung beibehalten.
          // Bei Ausfall nicht unbemerkt auf einen anderen Anbieter wechseln.
          const provider = providerExists
            ? currentProvider
            : (
                nextModels.find((entry) => entry.provider === 'openai') ??
                nextModels[0]
              )?.provider ?? 'openai';

          const availableModels = nextModels.filter(
            (entry) => entry.provider === provider && entry.available,
          );

          const currentModel = availableModels.find(
            (entry) => entry.model === previous.model,
          );

          const model =
            currentModel?.model ?? availableModels[0]?.model ?? '';

          if (
            previous.provider === provider &&
            previous.model === model
          ) {
            return previous;
          }

          return {
            ...previous,
            provider,
            model,
          };
        });
      } catch {
        if (cancelled) return;

        setModels([]);
        setModelsError(
          'Die KI-Anbieter konnten nicht geladen werden. ' +
            'Bitte die Verbindung prüfen und erneut versuchen.',
        );
      } finally {
        if (!cancelled) {
          setModelsLoading(false);
        }
      }
    };

    void loadModels();

    return () => {
      cancelled = true;
    };
  }, [modelsReload]);

  const selectionValid =
    !modelsLoading &&
    modelsError === null &&
    models.some(
      (entry) =>
        entry.provider === formValues.provider &&
        entry.model === formValues.model &&
        entry.available,
    );

  const updateFormValues = (
    updater: (
      previous: GenerateRequestFormValues,
    ) => GenerateRequestFormValues,
  ): void => {
    setValidationStarted(true);
    setShowSuccessMessage(false);
    setFormValues(updater);
  };

  const reloadModels = (): void => {
    if (isLoading || modelsLoading) return;

    // Sofort sperren, bevor der neue Lade-Effekt ausgeführt wird.
    setModelsLoading(true);
    setModelsError(null);
    setSelectionError(null);
    setShowSuccessMessage(false);
    setModelsReload((previous) => previous + 1);
  };

  const setProvider = (provider: GenerationProvider): void => {
    if (isLoading || modelsLoading || modelsError) return;

    const providerExists = models.some(
      (entry) => entry.provider === provider,
    );

    if (!providerExists) {
      setSelectionError(
        'Dieser KI-Anbieter wird vom Server nicht angeboten.',
      );
      return;
    }

    const firstAvailable = models.find(
      (entry) => entry.provider === provider && entry.available,
    );

    const unavailableReason = models.find(
      (entry) => entry.provider === provider && entry.reason,
    )?.reason;

    setSelectionError(
      firstAvailable
        ? null
        : unavailableReason ??
            'Für diesen Anbieter ist momentan kein Modell verfügbar.',
    );

    updateFormValues((previous) => {
      const currentModel = models.find(
        (entry) =>
          entry.provider === provider &&
          entry.model === previous.model &&
          entry.available,
      );

      return {
        ...previous,
        provider,
        model:
          previous.provider === provider && currentModel
            ? currentModel.model
            : firstAvailable?.model ?? '',
      };
    });
  };

  const setModel = (model: string): void => {
    if (isLoading || modelsLoading || modelsError) return;

    const selectedModel = models.find(
      (entry) =>
        entry.provider === formValues.provider &&
        entry.model === model,
    );

    if (!selectedModel?.available) {
      setSelectionError(
        selectedModel?.reason ??
          'Dieses Modell ist nicht verfügbar oder nicht freigegeben.',
      );

      updateFormValues((previous) => ({
        ...previous,
        model: '',
      }));

      return;
    }

    setSelectionError(null);

    updateFormValues((previous) => ({
      ...previous,
      model: selectedModel.model,
    }));
  };

  const handleNumericField = (
    name: string,
    value: string,
  ): boolean => {
    const difficultyKey = getDifficultyKey(name);

    if (name !== 'count' && difficultyKey === null) {
      return false;
    }

    const cleanedValue = sanitizeToDigitsOnly(value);

    const numericValue: number | '' =
      cleanedValue === '' ? '' : Number(cleanedValue);

    if (numericValue !== '' && !Number.isFinite(numericValue)) {
      return true;
    }

    if (name === 'count') {
      setDisplayValues((previous) => ({
        ...previous,
        count: cleanedValue,
      }));

      updateFormValues((previous) => ({
        ...previous,
        count: numericValue,
      }));

      return true;
    }

    if (difficultyKey !== null) {
      const displayKey = DIFFICULTY_DISPLAY_KEYS[difficultyKey];

      setDisplayValues((previous) => ({
        ...previous,
        [displayKey]: cleanedValue,
      }));

      updateFormValues((previous) => ({
        ...previous,
        difficultyDistribution: {
          ...previous.difficultyDistribution,
          [difficultyKey]: numericValue,
        },
      }));
    }

    return true;
  };

  const handleInputChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ): void => {
    const { name, value } = event.target;

    if (name === 'provider') {
      if (value === 'openai' || value === 'ollama') {
        setProvider(value);
      }
      return;
    }

    if (name === 'model') {
      setModel(value);
      return;
    }

    if (handleNumericField(name, value)) {
      return;
    }

    if (name === 'topic') {
      updateFormValues((previous) => ({
        ...previous,
        topic: value,
      }));
      return;
    }

    if (name === 'contextText') {
      updateFormValues((previous) => ({
        ...previous,
        contextText: value || undefined,
      }));
    }
  };

  const handleBlur = (
    event: FocusEvent<HTMLInputElement>,
  ): void => {
    const { name, value } = event.target;

    if (
      value === '' &&
      (name === 'count' || getDifficultyKey(name) !== null)
    ) {
      handleNumericField(name, value);
    }
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
  ): void => {
    const { name, value } = event.currentTarget;

    if (name !== 'count' && getDifficultyKey(name) === null) {
      return;
    }

    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
      return;
    }

    event.preventDefault();

    const currentValue = value === '' ? 0 : Number(value);

    if (!Number.isFinite(currentValue)) return;

    const nextValue =
      currentValue + (event.key === 'ArrowUp' ? 1 : -1);

    const minimum = name === 'count' ? 1 : 0;
    const maximum = name === 'count' ? 50 : 100;

    const boundedValue = Math.max(
      minimum,
      Math.min(maximum, nextValue),
    );

    handleNumericField(name, String(boundedValue));
  };

  const handleLanguageChange = (
    event: ChangeEvent<HTMLSelectElement>,
  ): void => {
    const value = event.target.value;

    if (value !== 'de' && value !== 'en') return;

    const language: Language = value;

    updateFormValues((previous) => ({
      ...previous,
      language,
    }));
  };

  const handleTypeToggle = (type: QuestionType): void => {
    updateFormValues((previous) => ({
      ...previous,
      types: previous.types.includes(type)
        ? previous.types.filter((entry) => entry !== type)
        : [...previous.types, type],
    }));
  };

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ): void => {
    event.preventDefault();

    if (isLoading) return;

    setValidationStarted(true);
    setShowSuccessMessage(false);

    const validationErrors = validate(formValues);
    setErrors(validationErrors);

    if (!selectionValid) {
      const unavailableReason = models.find(
        (entry) =>
          entry.provider === formValues.provider &&
          (!formValues.model || entry.model === formValues.model) &&
          !entry.available &&
          entry.reason,
      )?.reason;

      setSelectionError(
        modelsLoading
          ? 'Die KI-Anbieter werden noch geladen.'
          : modelsError ??
              unavailableReason ??
              'Bitte einen verfügbaren KI-Anbieter und ein Modell auswählen.',
      );
      return;
    }

    setSelectionError(null);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    // Unabhängiger Snapshot für den gestarteten Auftrag.
    const submittedValues = structuredClone(formValues);

    onSubmit?.(submittedValues);
    setShowSuccessMessage(true);
  };

  const setUploadContext = (
    value: string | undefined,
  ): void => {
    updateFormValues((previous) => ({
      ...previous,
      uploadContext: value,
    }));
  };

  return {
    models,
    modelsLoading,
    modelsError,
    selectionError,
    selectionValid,
    reloadModels,
    setProvider,
    setModel,
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
    setUploadContext,
  };
};