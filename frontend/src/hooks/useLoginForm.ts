import { useState, type ChangeEvent, type FocusEvent, type FormEvent } from 'react';
import { loginUser } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { LoginFormValues, LoginValidationErrors } from '../types/auth';
import { getLoginErrorMessage } from '../utils/errorUtils';
import { validateLoginForm } from '../validators/loginValidator';

// So startet das Login-Formular: Beide Felder sind anfangs leer.
const INITIAL_LOGIN_FORM_VALUES: LoginFormValues = {
  username: '',
  password: '',
};

type LoginTouchedFields = Record<keyof LoginFormValues, boolean>;

const INITIAL_TOUCHED_FIELDS: LoginTouchedFields = {
  username: false,
  password: false,
};

interface UseLoginFormProps {
  onSuccess?: () => void;
}

interface UseLoginFormReturn {
  formValues: LoginFormValues;
  errors: LoginValidationErrors;
  submitError: string | null;
  isLoading: boolean;
  handleInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleBlur: (event: FocusEvent<HTMLInputElement>) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

function getVisibleErrors(
  values: LoginFormValues,
  touchedFields: LoginTouchedFields,
  hasSubmitted: boolean
): LoginValidationErrors {
  const validationErrors = validateLoginForm(values);

  if (hasSubmitted) {
    return validationErrors;
  }

  return Object.fromEntries(
    Object.entries(validationErrors).filter(function ([fieldName]) {
      return touchedFields[fieldName as keyof LoginTouchedFields];
    })
  ) as LoginValidationErrors;
}

export function useLoginForm(
  props: UseLoginFormProps = {}
): UseLoginFormReturn {
  const { onSuccess } = props;
  const { login } = useAuth();
  const [formValues, setFormValues] = useState<LoginFormValues>(INITIAL_LOGIN_FORM_VALUES);
  const [errors, setErrors] = useState<LoginValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [touchedFields, setTouchedFields] = useState<LoginTouchedFields>(INITIAL_TOUCHED_FIELDS);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Uebernimmt Eingaben, loescht alte Submit-Fehler und zeigt Feldfehler erst bei Bedarf.
  function handleInputChange(event: ChangeEvent<HTMLInputElement>): void {
    const { name, value } = event.target;
    const fieldName = name as keyof LoginFormValues;

    setSubmitError(null);
    setFormValues(function (prevValues: LoginFormValues) {
      const nextValues = {
        ...prevValues,
        [fieldName]: value,
      };

      setErrors(getVisibleErrors(nextValues, touchedFields, hasSubmitted));
      return nextValues;
    });
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>): void {
    const fieldName = event.target.name as keyof LoginFormValues;
    const nextTouchedFields = {
      ...touchedFields,
      [fieldName]: true,
    };

    setTouchedFields(nextTouchedFields);
    setErrors(getVisibleErrors(formValues, nextTouchedFields, hasSubmitted));
  }

  // Beim Absenden pruefen wir erst das Formular und schicken erst dann den Login ans Backend.
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const validationErrors = validateLoginForm(formValues);
    setHasSubmitted(true);
    setTouchedFields({
      username: true,
      password: true,
    });
    setErrors(validationErrors);
    setSubmitError(null);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await loginUser(
        formValues.username.trim(),
        formValues.password
      );

      login(response.access_token);
      onSuccess?.();
    } catch (error) {
      setSubmitError(getLoginErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
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
