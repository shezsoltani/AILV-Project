import { resetPassword } from '../services/authApi';
import { getResetPasswordErrorMessage } from '../error-handling/errorMappers';
import { validateResetPasswordForm } from '../validators/resetPasswordValidator';
import { useFormWithTouchedValidation } from '../utils/useFormWithTouchedValidation';
import type { ResetPasswordFormValues } from '../types/auth';

const INITIAL_VALUES: ResetPasswordFormValues = {
  newPassword: '',
  confirmPassword: '',
};

interface UseResetPasswordFormProps {
  token: string;
  onSuccess?: () => void;
}

export function useResetPasswordForm({ token, onSuccess }: UseResetPasswordFormProps) {
  return useFormWithTouchedValidation(
    INITIAL_VALUES,
    validateResetPasswordForm,
    async (values, setSubmitError, setIsLoading) => {
      setIsLoading(true);
      try {
        await resetPassword(token, values.newPassword);
        onSuccess?.();
      } catch (error) {
        setSubmitError(getResetPasswordErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    }
  );
}
