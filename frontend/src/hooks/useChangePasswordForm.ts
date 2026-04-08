import { changePassword } from '../services/authApi';
import { useAuth } from '../context/AuthContext';
import type { ChangePasswordFormValues } from '../types/auth';
import { getChangePasswordErrorMessage } from '../error-handling/errorMappers';
import { validateChangePasswordForm } from '../validators/changePasswordValidator';
import { useFormWithTouchedValidation } from '../utils/useFormWithTouchedValidation';

const INITIAL_VALUES: ChangePasswordFormValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

interface UseChangePasswordFormProps {
  onSuccess?: () => void;
}

export function useChangePasswordForm({ onSuccess }: UseChangePasswordFormProps = {}) {
  const { logout } = useAuth();

  return useFormWithTouchedValidation(
    INITIAL_VALUES,
    validateChangePasswordForm,
    async (values, setSubmitError, setIsLoading) => {
      setIsLoading(true);
      try {
        await changePassword(values.currentPassword, values.newPassword);
        logout();
        onSuccess?.();
      } catch (error) {
        setSubmitError(getChangePasswordErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    }
  );
}
