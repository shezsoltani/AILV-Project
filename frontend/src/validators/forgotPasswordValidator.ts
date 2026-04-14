import type { ForgotPasswordFormValues, ForgotPasswordValidationErrors } from '../types/auth';

// Gleiche Logik wie in registerValidator – prüft ob eine grundlegende E-Mail-Struktur vorliegt.
function isEmailFormatValid(email: string): boolean {
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf('@');
  const lastDotIndex = trimmed.lastIndexOf('.');
  return atIndex > 0 && lastDotIndex > atIndex + 1 && lastDotIndex < trimmed.length - 1;
}

export function validateForgotPasswordForm(
  values: ForgotPasswordFormValues
): ForgotPasswordValidationErrors {
  const errors: ForgotPasswordValidationErrors = {};

  if (!values.email.trim()) {
    errors.email = 'Bitte geben Sie Ihre E-Mail-Adresse ein.';
  } else if (!isEmailFormatValid(values.email)) {
    errors.email = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
  }

  return errors;
}
