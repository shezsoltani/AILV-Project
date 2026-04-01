import type {
  ChangePasswordFormValues,
  ChangePasswordValidationErrors,
} from '../types/auth';
import { REGISTER_PASSWORD_MIN_LENGTH } from './registerValidator';

export function validateChangePasswordForm(
  values: ChangePasswordFormValues
): ChangePasswordValidationErrors {
  const errors: ChangePasswordValidationErrors = {};

  if (!values.currentPassword) {
    errors.currentPassword = 'Bitte geben Sie Ihr aktuelles Passwort ein.';
  }

  if (!values.newPassword) {
    errors.newPassword = 'Bitte geben Sie ein neues Passwort ein.';
  } else if (values.newPassword.length < REGISTER_PASSWORD_MIN_LENGTH) {
    errors.newPassword = `Das neue Passwort muss mindestens ${REGISTER_PASSWORD_MIN_LENGTH} Zeichen lang sein.`;
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Bitte bestätigen Sie das neue Passwort.';
  } else if (values.newPassword !== values.confirmPassword) {
    errors.confirmPassword = 'Die neuen Passwörter stimmen nicht überein.';
  }

  return errors;
}
