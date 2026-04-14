// Neues Passwort setzen. Token wird aus dem URL-Parameter ?token=... gelesen.

import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ErrorBanner } from '../components/ErrorBanner';
import { PasswordVisibilityToggle } from '../components/PasswordVisibilityToggle';
import { useResetPasswordForm } from '../hooks/useResetPasswordForm';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const { formValues, errors, submitError, isLoading, handleInputChange, handleBlur, handleSubmit } =
    useResetPasswordForm({
      token,
      onSuccess: () => navigate('/login'),
    });

  // Kein Token im URL – der Link ist unvollständig oder wurde falsch aufgerufen.
  if (!token) {
    return (
      <div className="page">
        <h1 className="page-title">Ungültiger Link</h1>
        <div className="page-form" style={{ maxWidth: '48rem' }}>
          <div className="card">
            <p>Dieser Reset-Link ist ungültig. Bitte fordern Sie einen neuen an.</p>
            <p className="form-helper" style={{ marginTop: '1.5rem', marginBottom: 0 }}>
              <Link to="/forgot-password">Neuen Reset-Link anfordern</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Neues Passwort setzen</h1>
      <p className="page-description">
        Geben Sie Ihr neues Passwort ein. Nach dem Speichern werden Sie zum Login weitergeleitet.
      </p>

      <div className="page-form" style={{ maxWidth: '48rem' }}>
        <div className="card">
          <form className="form" onSubmit={handleSubmit} noValidate autoComplete="on">
            <div className="form-row">
              <label className="form-label" htmlFor="newPassword">
                Neues Passwort *
              </label>
              <div className="form-input-wrapper form-input-wrapper--password">
                <input
                  id="newPassword"
                  name="newPassword"
                  type={newPasswordVisible ? 'text' : 'password'}
                  className={`form-input${errors.newPassword ? ' form-input--error' : ''}`}
                  value={formValues.newPassword}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  autoComplete="new-password"
                  required
                />
                <PasswordVisibilityToggle
                  isVisible={newPasswordVisible}
                  onToggle={() => setNewPasswordVisible((v) => !v)}
                />
              </div>
              {errors.newPassword && <p className="form-error-message">{errors.newPassword}</p>}
            </div>

            <div className="form-row">
              <label className="form-label" htmlFor="confirmPassword">
                Passwort bestätigen *
              </label>
              <div className="form-input-wrapper form-input-wrapper--password">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={confirmPasswordVisible ? 'text' : 'password'}
                  className={`form-input${errors.confirmPassword ? ' form-input--error' : ''}`}
                  value={formValues.confirmPassword}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  autoComplete="new-password"
                  required
                />
                <PasswordVisibilityToggle
                  isVisible={confirmPasswordVisible}
                  onToggle={() => setConfirmPasswordVisible((v) => !v)}
                />
              </div>
              {errors.confirmPassword && (
                <p className="form-error-message">{errors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              className="primary-button form-submit-button"
              disabled={isLoading}
            >
              {isLoading ? 'Passwort wird gespeichert…' : 'Passwort speichern'}
            </button>

            <ErrorBanner message={submitError} style={{ marginTop: '1rem' }} />
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
