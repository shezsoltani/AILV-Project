import { useState, type ChangeEvent, type FocusEvent, type FormEvent } from 'react';
import { registerUser } from '../services/api';
import type { RegisterFormValues, RegisterValidationErrors } from '../types/auth';
import { getRegistrationErrorMessage } from '../utils/errorUtils';
import { validateRegisterForm } from '../validators/registerValidator';

// So startet das Formular: Am Anfang sind alle Felder leer.
const INITIAL_REGISTER_FORM_VALUES: RegisterFormValues = {
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
};

type RegisterTouchedFields = Record<keyof RegisterFormValues, boolean>;

const INITIAL_TOUCHED_FIELDS: RegisterTouchedFields = {
  username: false,
  email: false,
  password: false,
  confirmPassword: false,
};

interface UseRegisterFormProps {
  onSuccess?: () => void;
}

interface UseRegisterFormReturn {
  formValues: RegisterFormValues;
  errors: RegisterValidationErrors;
  submitError: string | null;
  isLoading: boolean;
  handleInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleBlur: (event: FocusEvent<HTMLInputElement>) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

function getVisibleErrors(
  values: RegisterFormValues,
  touchedFields: RegisterTouchedFields,
  hasSubmitted: boolean
): RegisterValidationErrors {
  const validationErrors = validateRegisterForm(values);

  if (hasSubmitted) {
    return validationErrors;
  }

  return Object.fromEntries(
    Object.entries(validationErrors).filter(([fieldName]) => {
      return touchedFields[fieldName as keyof RegisterTouchedFields];
    })
  ) as RegisterValidationErrors;
}

export function useRegisterForm({
  onSuccess,
}: UseRegisterFormProps = {}): UseRegisterFormReturn {
  // Diese States merken sich Eingaben, Feldfehler, einen allgemeinen Fehler und den Ladezustand.
  const [formValues, setFormValues] = useState<RegisterFormValues>(INITIAL_REGISTER_FORM_VALUES);
  const [errors, setErrors] = useState<RegisterValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [touchedFields, setTouchedFields] = useState<RegisterTouchedFields>(INITIAL_TOUCHED_FIELDS);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Diese Funktion laeuft bei jeder Eingabe: Wert uebernehmen, alten Submit-Fehler loeschen, neu pruefen.
  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const fieldName = name as keyof RegisterFormValues;

    setSubmitError(null);
    setFormValues((prev: RegisterFormValues) => {
      const nextValues = {
        ...prev,
        [fieldName]: value,
      };

      setErrors(getVisibleErrors(nextValues, touchedFields, hasSubmitted));
      return nextValues;
    });
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    const fieldName = event.target.name as keyof RegisterFormValues;
    const nextTouchedFields = {
      ...touchedFields,
      [fieldName]: true,
    };

    setTouchedFields(nextTouchedFields);
    setErrors(getVisibleErrors(formValues, nextTouchedFields, hasSubmitted));
  };

  // Beim Absenden stoppen wir das normale Browser-Verhalten und pruefen zuerst das komplette Formular.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationErrors = validateRegisterForm(formValues);
    setHasSubmitted(true);
    setTouchedFields({
      username: true,
      email: true,
      password: true,
      confirmPassword: true,
    });
    setErrors(validationErrors);
    setSubmitError(null);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsLoading(true);

    try {
      // Erst wenn alles gueltig ist, schicken wir die Daten ans Backend.
      await registerUser(
        formValues.username.trim(),
        formValues.email.trim(),
        formValues.password
      );

      // onSuccess --> z.B. um nach erfolgreicher Registrierung auf /login wechseln.
      onSuccess?.();
    } catch (error) {
      // Backend-Fehler werden hier in eine verstaendliche Meldung fuer den Nutzer uebersetzt.
      setSubmitError(getRegistrationErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

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
