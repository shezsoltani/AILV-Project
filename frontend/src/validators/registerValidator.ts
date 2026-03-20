import type { RegisterFormValues, RegisterValidationErrors } from '../types/auth';

export const REGISTER_PASSWORD_MIN_LENGTH = 8;

function isEmailFormatValid(email: string): boolean {
  const trimmedEmail = email.trim();
  const atIndex = trimmedEmail.indexOf('@');
  const lastDotIndex = trimmedEmail.lastIndexOf('.');

  return atIndex > 0 && lastDotIndex > atIndex + 1 && lastDotIndex < trimmedEmail.length - 1;
}

export function validateRegisterForm(
  values: RegisterFormValues
): RegisterValidationErrors {
  const errors: RegisterValidationErrors = {};

  if (!values.username.trim()) {
    errors.username = 'Bitte geben Sie einen Benutzernamen ein.';
  }

  if (!values.email.trim()) {
    errors.email = 'Bitte geben Sie eine E-Mail-Adresse ein.';
  } else if (!isEmailFormatValid(values.email)) {
    errors.email = 'Bitte geben Sie eine gueltige E-Mail-Adresse ein.';
  }

  if (!values.password) {
    errors.password = 'Bitte geben Sie ein Passwort ein.';
  } else if (values.password.length < REGISTER_PASSWORD_MIN_LENGTH) {
    errors.password = `Das Passwort muss mindestens ${REGISTER_PASSWORD_MIN_LENGTH} Zeichen lang sein.`;
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Bitte bestaetigen Sie Ihr Passwort.';
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Die Passwoerter stimmen nicht ueberein.';
  }

  return errors;
}
