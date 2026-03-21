import type { LoginFormValues, LoginValidationErrors } from '../types/auth';

export function validateLoginForm(
  values: LoginFormValues
): LoginValidationErrors {
  const errors: LoginValidationErrors = {};

  if (!values.username.trim()) {
    errors.username = 'Bitte geben Sie Ihren Benutzernamen ein.';
  }

  if (!values.password) {
    errors.password = 'Bitte geben Sie Ihr Passwort ein.';
  }

  return errors;
}
