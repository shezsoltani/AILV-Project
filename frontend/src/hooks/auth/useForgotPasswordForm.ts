import { useState, type ChangeEvent, type FormEvent } from 'react';
import { ApiError } from '../../error-handling/AppErrors';
import { getUserFriendlyMessage } from '../../error-handling/errorMappers';
import { forgotPassword } from '../../services/authApi';
import { validateForgotPasswordForm } from '../../validators/forgotPasswordValidator';

export function useForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [isTouched, setIsTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Nach dem Absenden immer true, außer bei zu vielen Versuchen.
  const [isSuccess, setIsSuccess] = useState(false);

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    const next = event.target.value;
    setEmail(next);
    if (isTouched) {
      setEmailError(validateForgotPasswordForm({ email: next }).email);
    }
  }

  function handleBlur(): void {
    setIsTouched(true);
    setEmailError(validateForgotPasswordForm({ email }).email);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const validationError = validateForgotPasswordForm({ email }).email;
    if (validationError) {
      setIsTouched(true);
      setEmailError(validationError);
      return;
    }

    setIsLoading(true);
    setSubmitError(null);
    try {
      await forgotPassword(email);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 429) {
        setSubmitError(getUserFriendlyMessage(error));
        return;
      }
      // Andere Fehler ignorieren, damit nicht erkennbar ist, ob die E-Mail existiert.
    } finally {
      setIsLoading(false);
    }
    setIsSuccess(true);
  }

  return { email, emailError, submitError, isLoading, isSuccess, handleChange, handleBlur, handleSubmit };
}
