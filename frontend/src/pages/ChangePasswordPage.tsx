// Passwort ändern (eingeloggt). Nach Erfolg: Logout und Weiterleitung zum Login.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorBanner } from '../components/ErrorBanner';
import { PasswordVisibilityToggle } from '../components/PasswordVisibilityToggle';
import { useChangePasswordForm } from '../hooks/useChangePasswordForm';

const ChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentVisible, setCurrentVisible] = useState(false);
  const [newVisible, setNewVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const {
    formValues,
    errors,
    submitError,
    isLoading,
    handleInputChange,
    handleBlur,
    handleSubmit,
  } = useChangePasswordForm({
    onSuccess: () => navigate('/login'),
  });

  return (
    <div className="page">
      <h1 className="page-title">Passwort ändern</h1>
      <p className="page-description">
        Aus Sicherheitsgründen werden Sie nach erfolgreicher Änderung abgemeldet und können sich mit
        dem neuen Passwort wieder anmelden.
      </p>

      <div className="page-form" style={{ maxWidth: '48rem' }}>
        <div className="card">
          <form className="form" onSubmit={handleSubmit} noValidate autoComplete="on">
            <div className="form-row">
              <label className="form-label" htmlFor="currentPassword">
                Aktuelles Passwort *
              </label>
              <div className="form-input-wrapper form-input-wrapper--password">
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type={currentVisible ? 'text' : 'password'}
                  className={`form-input${errors.currentPassword ? ' form-input--error' : ''}`}
                  value={formValues.currentPassword}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  autoComplete="current-password"
                  required
                />
                <PasswordVisibilityToggle
                  isVisible={currentVisible}
                  onToggle={() => setCurrentVisible((v) => !v)}
                />
              </div>
              {errors.currentPassword && (
                <p className="form-error-message">{errors.currentPassword}</p>
              )}
            </div>

            <div className="form-row">
              <label className="form-label" htmlFor="newPassword">
                Neues Passwort *
              </label>
              <p className="form-helper" style={{ marginTop: 0 }}>
                Mindestens 8 Zeichen, wie bei der Registrierung.
              </p>
              <div className="form-input-wrapper form-input-wrapper--password">
                <input
                  id="newPassword"
                  name="newPassword"
                  type={newVisible ? 'text' : 'password'}
                  className={`form-input${errors.newPassword ? ' form-input--error' : ''}`}
                  value={formValues.newPassword}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  autoComplete="new-password"
                  required
                />
                <PasswordVisibilityToggle
                  isVisible={newVisible}
                  onToggle={() => setNewVisible((v) => !v)}
                />
              </div>
              {errors.newPassword && (
                <p className="form-error-message">{errors.newPassword}</p>
              )}
            </div>

            <div className="form-row">
              <label className="form-label" htmlFor="confirmPassword">
                Neues Passwort bestätigen *
              </label>
              <div className="form-input-wrapper form-input-wrapper--password">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={confirmVisible ? 'text' : 'password'}
                  className={`form-input${errors.confirmPassword ? ' form-input--error' : ''}`}
                  value={formValues.confirmPassword}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  autoComplete="new-password"
                  required
                />
                <PasswordVisibilityToggle
                  isVisible={confirmVisible}
                  onToggle={() => setConfirmVisible((v) => !v)}
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
              {isLoading ? 'Passwort wird geändert…' : 'Passwort ändern'}
            </button>

            <ErrorBanner message={submitError} style={{ marginTop: '1rem' }} />
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
