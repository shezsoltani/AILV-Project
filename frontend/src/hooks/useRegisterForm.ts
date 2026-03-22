// src/hooks/useRegisterForm.ts
// Kümmert sich um Registrierungslogik

import { registerUser } from '../services/authApi';
import type { RegisterFormValues } from '../types/auth';
import { getRegistrationErrorMessage } from '../utils/errorUtils';
import { validateRegisterForm } from '../validators/registerValidator';
import { useFormWithTouchedValidation } from '../utils/useFormWithTouchedValidation';

const INITIAL_VALUES: RegisterFormValues = {
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
};

interface UseRegisterFormProps {
  onSuccess?: () => void;
}

export function useRegisterForm({ onSuccess }: UseRegisterFormProps = {}) {
  return useFormWithTouchedValidation(
    INITIAL_VALUES,
    validateRegisterForm,
    async (values, setSubmitError, setIsLoading) => {
      setIsLoading(true);
      try {
        await registerUser(values.username.trim(), values.email.trim(), values.password);
        onSuccess?.();
      } catch (error) {
        setSubmitError(getRegistrationErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    }
  );
}
