// src/pages/RegisterPage.tsx
// Registrierungs-Seite. Formular und Passwortstärke-Anzeige.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';
import { ErrorBanner } from '../components/ErrorBanner';
import { PasswordVisibilityToggle } from '../components/PasswordVisibilityToggle';
import { useRegisterForm } from '../hooks/useRegisterForm';

const RegisterPage: React.FC = () => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const navigate = useNavigate();
  const {
    formValues,
    errors,
    submitError,
    isLoading,
    handleInputChange,
    handleBlur,
    handleSubmit,
  } = useRegisterForm({
    onSuccess: () => navigate('/login'),
  });

  return (
    <div className="page">
      <h1 className="page-title">Registrieren</h1>
      <p className="page-description">
      Erstellen Sie ein Konto und starten Sie direkt mit der Generierung von LV-Unterlagen.
      </p>

      <div className="page-form" style={{ maxWidth: '48rem' }}>
        <div className="card">
          <form className="form" onSubmit={handleSubmit} noValidate autoComplete="on">
            <div className="form-row">
              <label className="form-label" htmlFor="username">
                Benutzername *
              </label>
              <input
                id="username"
                name="username"
                type="text"
                className={`form-input${errors.username ? ' form-input--error' : ''}`}
                value={formValues.username}
                onChange={handleInputChange}
                onBlur={handleBlur}
                autoComplete="username"
                required
              />
              {errors.username && (
                <p className="form-error-message">{errors.username}</p>
              )}
            </div>

            <div className="form-row">
              <label className="form-label" htmlFor="email">
                E-Mail *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className={`form-input${errors.email ? ' form-input--error' : ''}`}
                value={formValues.email}
                onChange={handleInputChange}
                onBlur={handleBlur}
                autoComplete="email"
                required
              />
              {errors.email && (
                <p className="form-error-message">{errors.email}</p>
              )}
            </div>

            <div className="form-row">
              <label className="form-label" htmlFor="password">
                Passwort *
              </label>
              <p id="register-password-tips" className="form-helper" style={{ marginTop: 0 }}>
                Mindestens 8 Zeichen. Ein starkes Passwort mischt Groß-/Kleinbuchstaben, Ziffern und
                gern Sonderzeichen.
              </p>
              <div className="form-input-wrapper form-input-wrapper--password">
                <input
                  id="password"
                  name="password"
                  type={isPasswordVisible ? 'text' : 'password'}
                  className={`form-input${errors.password ? ' form-input--error' : ''}`}
                  value={formValues.password}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  autoComplete="new-password"
                  required
                  aria-describedby={[
                    'register-password-tips',
                    formValues.password.length > 0 ? 'register-password-strength' : '',
                    errors.password ? 'register-password-error' : '',
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined}
                />
                <PasswordVisibilityToggle
                  isVisible={isPasswordVisible}
                  onToggle={() => setIsPasswordVisible((prev) => !prev)}
                />
              </div>
              <PasswordStrengthMeter password={formValues.password} idPrefix="register" />
              {errors.password && (
                <p id="register-password-error" className="form-error-message">
                  {errors.password}
                </p>
              )}
            </div>

            <div className="form-row">
              <label className="form-label" htmlFor="confirmPassword">
                Passwort bestätigen *
              </label>
              <div className="form-input-wrapper form-input-wrapper--password">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={isConfirmPasswordVisible ? 'text' : 'password'}
                  className={`form-input${errors.confirmPassword ? ' form-input--error' : ''}`}
                  value={formValues.confirmPassword}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  autoComplete="new-password"
                  required
                />
                <PasswordVisibilityToggle
                  isVisible={isConfirmPasswordVisible}
                  onToggle={() => setIsConfirmPasswordVisible((prev) => !prev)}
                  showLabel="Bestätigungspasswort anzeigen"
                  hideLabel="Bestätigungspasswort verbergen"
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
              {isLoading ? 'Registrierung läuft...' : 'Konto erstellen'}
            </button>

            <ErrorBanner message={submitError} style={{ marginTop: '1rem' }} />
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
