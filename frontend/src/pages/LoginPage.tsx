// src/pages/LoginPage.tsx
// Login-Seite. Nach erfolgreichem Login: navigate. Optional: Ziel aus location.state.from.

import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useLoginForm } from '../hooks/useLoginForm';
import { ErrorBanner } from '../components/ErrorBanner';
import { PasswordVisibilityToggle } from '../components/PasswordVisibilityToggle';

function LoginPage() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Pfad aus location.state.from, falls gesetzt (Redirect von geschützter Route).
  const redirectedFrom = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  const PAGE_NAMES: Record<string, string> = {
    '/generate': 'Fragen generieren',
    '/archive': 'Archiv',
  };

  const redirectedFromName = redirectedFrom ? (PAGE_NAMES[redirectedFrom] ?? redirectedFrom) : null;

  const {
    formValues,
    errors,
    submitError,
    isLoading,
    handleInputChange,
    handleBlur,
    handleSubmit,
  } = useLoginForm({
    onSuccess: function () {
      navigate(redirectedFrom ?? '/');
    },
  });

  return (
    <div className="page">
      <h1 className="page-title">Login</h1>
      <p className="page-description">
        Melden Sie sich an, um auf Funktionen wie Generierung und Archiv zuzugreifen.
      </p>

      {redirectedFromName && (
        <div className="info-banner" role="status">
          <div className="info-banner-content">
            Bitte einloggen, um <strong>{redirectedFromName}</strong> zu öffnen.
          </div>
        </div>
      )}

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
              <label className="form-label" htmlFor="password">
                Passwort *
              </label>
              <div className="form-input-wrapper form-input-wrapper--password">
                <input
                  id="password"
                  name="password"
                  type={isPasswordVisible ? 'text' : 'password'}
                  className={`form-input${errors.password ? ' form-input--error' : ''}`}
                  value={formValues.password}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  autoComplete="current-password"
                  required
                />
                <PasswordVisibilityToggle
                  isVisible={isPasswordVisible}
                  onToggle={() => setIsPasswordVisible((prev) => !prev)}
                />
              </div>
              {errors.password && (
                <p className="form-error-message">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              className="primary-button form-submit-button"
              disabled={isLoading}
            >
              {isLoading ? 'Login läuft...' : 'Einloggen'}
            </button>

            <ErrorBanner message={submitError} style={{ marginTop: '1rem' }} />

            <p className="form-helper" style={{ marginBottom: 0 }}>
              <Link to="/forgot-password">Passwort vergessen?</Link>
            </p>
            <p className="form-helper" style={{ marginBottom: 0 }}>
              Noch kein Konto?{' '}
              <Link to="/register">
                Zur Registrierung
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
