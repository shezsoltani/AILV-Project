// src/hooks/useLoginForm.ts
// Kümmert sich um Login-Logik

import { loginUser } from '../services/authApi';
import { useAuth } from '../context/AuthContext';
import type { LoginFormValues } from '../types/auth';
import { getLoginErrorMessage } from '../error-handling/errorMappers';
import { validateLoginForm } from '../validators/loginValidator';
import { useFormWithTouchedValidation } from '../utils/useFormWithTouchedValidation';

const INITIAL_VALUES: LoginFormValues = {
  username: '',
  password: '',
};

interface UseLoginFormProps {
  onSuccess?: () => void;
}

export function useLoginForm({ onSuccess }: UseLoginFormProps = {}) {
  const { login } = useAuth();

  // Nutzt useFormWithTouchedValidation, um Formularzustand und Validierung zu verwalten. Bei Erfolg wird das Token im AuthContext gespeichert.
  return useFormWithTouchedValidation(
    INITIAL_VALUES,
    validateLoginForm,
    async (values, setSubmitError, setIsLoading) => {
      setIsLoading(true);
      try {
        const response = await loginUser(values.username.trim(), values.password);
        login(response.access_token);
        onSuccess?.();
      } catch (error) {
        setSubmitError(getLoginErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    }
  );
}