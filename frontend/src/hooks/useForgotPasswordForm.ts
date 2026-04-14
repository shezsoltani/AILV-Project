import { useState, type ChangeEvent, type FormEvent } from 'react';
import { forgotPassword } from '../services/authApi';
import { validateForgotPasswordForm } from '../validators/forgotPasswordValidator';

export function useForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [isTouched, setIsTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Immer true nach Absenden – unabhängig vom API-Ergebnis (Sicherheitsstandard).
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
    try {
      await forgotPassword(email);
    } catch {
      // Absichtlich ignoriert – Erfolgsmeldung wird immer gezeigt, damit
      // nicht erkennbar ist, ob die E-Mail im System existiert.
    } finally {
      setIsLoading(false);
      setIsSuccess(true);
    }
  }

  return { email, emailError, isLoading, isSuccess, handleChange, handleBlur, handleSubmit };
}
