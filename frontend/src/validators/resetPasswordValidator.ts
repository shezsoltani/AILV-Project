import type { ResetPasswordFormValues, ResetPasswordValidationErrors } from '../types/auth';
import { REGISTER_PASSWORD_MIN_LENGTH } from './registerValidator';

export function validateResetPasswordForm(
  values: ResetPasswordFormValues
): ResetPasswordValidationErrors {
  const errors: ResetPasswordValidationErrors = {};

  if (!values.newPassword) {
    errors.newPassword = 'Bitte geben Sie ein neues Passwort ein.';
  } else if (values.newPassword.length < REGISTER_PASSWORD_MIN_LENGTH) {
    errors.newPassword = `Das Passwort muss mindestens ${REGISTER_PASSWORD_MIN_LENGTH} Zeichen lang sein.`;
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Bitte bestätigen Sie das neue Passwort.';
  } else if (values.newPassword !== values.confirmPassword) {
    errors.confirmPassword = 'Die Passwörter stimmen nicht überein.';
  }

  return errors;
}
