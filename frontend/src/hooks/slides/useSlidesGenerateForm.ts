// src/hooks/slides/useSlidesGenerateForm.ts
// Verwaltet State, Validierung und Submit für das Folien-Generierungsformular.

import { useEffect, useState, type ChangeEvent } from 'react';
import type { Language } from '../../types/generate';
import type {
  SlidesGenerateRequest,
  SlidesGenerateResponse,
} from '../../types/slides';
import {
  validate,
  type SlidesValidationErrors,
} from '../../validators/slidesGenerateValidator';
import { useFormWithTouchedValidation } from '../shared/useFormWithTouchedValidation';
import { generateSlides, finalizeSlides } from '../../services/slidesApi';
import { cancelJob } from '../../services/jobsApi';
import { getUserFriendlyMessage } from '../../error-handling/errorMappers';
import { sanitizeToDigitsOnly } from '../../utils/inputSanitizer';
import { useJobContext } from '../../context/JobContext';

export interface SlidesFormValues {
  topic: string;
  slideCount: string;
  language: Language;
  contextText: string;
  uploadContext: string;
}

const INITIAL_VALUES: SlidesFormValues = {
  topic: '',
  slideCount: '',
  language: 'de',
  contextText: '',
  uploadContext: '',
};

// Wandelt den internen Formular-State in das vom Validator/API erwartete Format.
const toApiRequest = (
  values: SlidesFormValues,
  customPrompts?: Record<string, string>
): SlidesGenerateRequest => {
  const trimmedContext = values.contextText.trim();
  return {
    topic: values.topic,
    slideCount: values.slideCount === '' ? '' : Number(values.slideCount),
    language: values.language,
    ...(trimmedContext ? { contextText: trimmedContext } : {}),
    ...(values.uploadContext ? { uploadContext: values.uploadContext } : {}),
    ...(customPrompts ? { customPrompts } : {}),
  };
};

const validateFormValues = (
  values: SlidesFormValues,
): SlidesValidationErrors => validate(toApiRequest(values));

interface UseSlidesGenerateFormProps {
  onSuccess?: (response: SlidesGenerateResponse) => void;
  onGenerateStart?: () => void;
  customPrompts?: Record<string, string>;
}

export interface UseSlidesGenerateFormReturn {
  formValues: SlidesFormValues;
  errors: SlidesValidationErrors;
  submitError: string | null;
  isSubmitting: boolean;
  jobId: string | null; // ID des laufenden asynchronen Generierungs-Jobs
  jobStatus: 'pending' | 'running' | 'completed' | 'failed' | null;
  jobProgress: number | null;
  jobStageLabel: string | null;
  clearJobId: () => void;
  hasValidationErrors: boolean;
  handleInputChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  handleBlur: (
    event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  setUploadContext: (value: string | undefined) => void;
  regenerate: () => Promise<void>;
  saveSlides: (name: string) => Promise<void>;
  cancelGeneration: () => Promise<void>;
  isSaving: boolean;
  isSaved: boolean;
}

export function useSlidesGenerateForm(
  props: UseSlidesGenerateFormProps = {}
): UseSlidesGenerateFormReturn {
  const { customPrompts } = props;
  const { activeJob, addJob, dismissJob } = useJobContext();
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [persistentJobId, setPersistentJobId] = useState<string | null>(null);
  const slidesJob = activeJob?.jobType === 'generate_slides' ? activeJob : null;

  // Backend gibt sofort eine job_id zurück; das eigentliche Rendern passiert über Polling.
  const submitValues = async (
    values: SlidesFormValues,
    setSubmitError: (err: string | null) => void,
    setIsLoading: (loading: boolean) => void,
  ): Promise<void> => {
    setIsLoading(true);
    dismissJob();
    setRequestId(null);
    props.onGenerateStart?.();
    try {
      const result = await generateSlides(toApiRequest(values, customPrompts));
      addJob(result.job_id, 'generate_slides'); // Job im Context registrieren → Polling startet
      setPersistentJobId(result.job_id);
      setIsSaved(false);
    } catch (error) {
      setSubmitError(getUserFriendlyMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const base = useFormWithTouchedValidation<SlidesFormValues, SlidesValidationErrors>(
    INITIAL_VALUES,
    validateFormValues,
    submitValues,
  );

  // slideCount: auf reine Ziffern beschränken, bevor der State aktualisiert wird.
  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;

    if (name === 'slideCount') {
      base.setFieldValue('slideCount', sanitizeToDigitsOnly(value));
      return;
    }

    base.handleInputChange(event);
  };

  // Wird von der PdfUpload-Komponente aufgerufen, sobald der Text extrahiert ist.
  const setUploadContext = (value: string | undefined) => {
    base.setFieldValue('uploadContext', value ?? '');
  };

  // Nutzt dieselben Formularwerte wie der letzte Submit, ohne das Formular zu leeren.
  const regenerate = async (): Promise<void> => {
    base.setSubmitError(null);
    await submitValues(base.formValues, base.setSubmitError, base.setIsLoading);
  };

  const saveSlides = async (name: string): Promise<void> => {
    if (!requestId) return;
    setIsSaving(true);
    try {
      await finalizeSlides({ request_id: requestId, name });
      setIsSaved(true);
    } catch (error) {
      base.setSubmitError(getUserFriendlyMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const cancelGeneration = async (): Promise<void> => {
    if (!slidesJob?.jobId || !isGeneratingJob(slidesJob.status)) {
      return;
    }

    try {
      await cancelJob(slidesJob.jobId);
    } catch (error) {
      console.error('Fehler beim Abbrechen der Folien-Generierung:', error);
    } finally {
      dismissJob();
      setPersistentJobId(null);
      setRequestId(null);
    }
  };

  const clearJobId = (): void => {
    dismissJob();
    setPersistentJobId(null);
    setRequestId(null);
  };

  useEffect(
    function syncSlidesJobResult() {
      if (!slidesJob) {
        return;
      }

      setPersistentJobId(slidesJob.jobId);

      if (slidesJob.status === 'failed') {
        base.setSubmitError(slidesJob.errorMessage ?? 'Folien konnten nicht generiert werden.');
        return;
      }

      if (slidesJob.status !== 'completed' || !slidesJob.resultData) {
        return;
      }

      const result = slidesJob.resultData as SlidesGenerateResponse;
      if (Array.isArray(result.slides) && typeof result.request_id === 'string') {
        setRequestId(result.request_id);
        props.onSuccess?.(result);
      } else {
        base.setSubmitError('Ungültiges Ergebnisformat vom Job-Status.');
      }
    },
    [slidesJob, props.onSuccess]
  );

  return {
    formValues: base.formValues,
    errors: base.errors,
    submitError: base.submitError,
    isSubmitting: base.isLoading,
    jobId: persistentJobId ?? slidesJob?.jobId ?? null,
    jobStatus: slidesJob?.status ?? null,
    jobProgress: slidesJob?.progress ?? null,
    jobStageLabel: slidesJob?.stageLabel ?? null,
    clearJobId,
    hasValidationErrors: Object.keys(base.errors).length > 0,
    handleInputChange,
    handleBlur: base.handleBlur,
    handleSubmit: base.handleSubmit,
    setUploadContext,
    regenerate,
    saveSlides,
    cancelGeneration,
    isSaving,
    isSaved,
  };
}

function isGeneratingJob(status: 'pending' | 'running' | 'completed' | 'failed'): boolean {
  return status === 'pending' || status === 'running';
}
