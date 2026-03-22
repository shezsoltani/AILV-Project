// src/utils/useFormWithTouchedValidation.ts
// Speichert Formularwerte und Fehler. Validiert. Ruft `onSubmitValidated` nur auf, wenn die Validierung leer ist.

import { useState, type ChangeEvent, type FocusEvent, type FormEvent } from 'react';

// Pro Feld: wurde das Eingabefeld schon verlassen (blur).
type TouchedFields<TValues> = Record<keyof TValues, boolean>;
type ValidationErrors<TValues> = Partial<Record<keyof TValues, string>>;

export function useFormWithTouchedValidation<
  TValues extends object,
  TErrors extends ValidationErrors<TValues>
>(
  initialValues: TValues,
  validateFn: (values: TValues) => TErrors,
  onSubmitValidated: (
    values: TValues,
    setSubmitError: (err: string | null) => void,
    setIsLoading: (loading: boolean) => void
  ) => Promise<void>
) {
  const initialTouched = Object.fromEntries(
    Object.keys(initialValues).map((key) => [key, false])
  ) as TouchedFields<TValues>;

  const [formValues, setFormValues] = useState<TValues>(initialValues);
  const [errors, setErrors] = useState<TErrors>({} as TErrors);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [touchedFields, setTouchedFields] = useState<TouchedFields<TValues>>(initialTouched);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Nicht abgesendet: nur Fehler für Felder mit touched. Nach Absenden: alle Validierungsfehler.
  function getVisibleErrors(
    values: TValues,
    touched: TouchedFields<TValues>,
    submitted: boolean
  ): TErrors {
    const validationErrors = validateFn(values);
    if (submitted) return validationErrors;
    return Object.fromEntries(
      Object.entries(validationErrors).filter(([fieldName]) =>
        touched[fieldName as keyof TValues]
      )
    ) as TErrors;
  }

  // Eingabe ändern, Fehler neu berechnen, Submit-Fehler löschen.
  function handleInputChange(event: ChangeEvent<HTMLInputElement>): void {
    const { name, value } = event.target;
    const fieldName = name as keyof TValues;
    setSubmitError(null);
    setFormValues((prev: TValues) => {
      const next = { ...prev, [fieldName]: value } as TValues;
      setErrors(getVisibleErrors(next, touchedFields, hasSubmitted));
      return next;
    });
  }

  // blur: Feld als touched markieren.
  function handleBlur(event: FocusEvent<HTMLInputElement>): void {
    const fieldName = event.target.name as keyof TValues;
    const nextTouched = { ...touchedFields, [fieldName]: true };
    setTouchedFields(nextTouched);
    setErrors(getVisibleErrors(formValues, nextTouched, hasSubmitted));
  }

  // submit: preventDefault, validieren, bei Fehlern Abbruch, sonst Callback.
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const validationErrors = validateFn(formValues);
    const allTouched = Object.fromEntries(
      Object.keys(initialValues).map((key) => [key, true])
    ) as TouchedFields<TValues>;

    setHasSubmitted(true);
    setTouchedFields(allTouched);
    setErrors(validationErrors);
    setSubmitError(null);

    if (Object.keys(validationErrors).length > 0) return;

    await onSubmitValidated(formValues, setSubmitError, setIsLoading);
  }

  return {
    formValues,
    errors,
    submitError,
    isLoading,
    handleInputChange,
    handleBlur,
    handleSubmit,
  };
}
