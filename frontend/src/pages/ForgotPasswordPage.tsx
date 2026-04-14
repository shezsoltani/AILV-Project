// Passwort vergessen. Zeigt nach Absenden immer eine Erfolgsmeldung (Sicherheitsstandard).

import React from 'react';
import { Link } from 'react-router-dom';
import { useForgotPasswordForm } from '../hooks/useForgotPasswordForm';

const ForgotPasswordPage: React.FC = () => {
  const { email, emailError, isLoading, isSuccess, handleChange, handleBlur, handleSubmit } =
    useForgotPasswordForm();

  if (isSuccess) {
    return (
      <div className="page">
        <h1 className="page-title">E-Mail gesendet</h1>
        <div className="page-form" style={{ maxWidth: '48rem' }}>
          <div className="card">
            <p>
              Falls diese E-Mail-Adresse bei uns registriert ist, haben wir Ihnen einen Reset-Link
              zugesendet. Bitte prüfen Sie Ihren Posteingang.
            </p>
            <p className="form-helper" style={{ marginTop: '1.5rem', marginBottom: 0 }}>
              <Link to="/login">Zurück zum Login</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Passwort vergessen</h1>
      <p className="page-description">
        Geben Sie Ihre E-Mail-Adresse ein. Falls ein Konto existiert, erhalten Sie einen Reset-Link.
      </p>

      <div className="page-form" style={{ maxWidth: '48rem' }}>
        <div className="card">
          <form className="form" onSubmit={handleSubmit} noValidate>
            <div className="form-row">
              <label className="form-label" htmlFor="email">
                E-Mail-Adresse *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className={`form-input${emailError ? ' form-input--error' : ''}`}
                value={email}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="email"
                required
              />
              {emailError && <p className="form-error-message">{emailError}</p>}
            </div>

            <button
              type="submit"
              className="primary-button form-submit-button"
              disabled={isLoading}
            >
              {isLoading ? 'Wird gesendet…' : 'Reset-Link anfordern'}
            </button>

            <p className="form-helper" style={{ marginBottom: 0 }}>
              <Link to="/login">Zurück zum Login</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
