import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useLoginForm } from '../hooks/useLoginForm';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Wenn der Nutzer von einer geschuetzten Seite hierher weitergeleitet wurde, steht dort der Ursprungspfad.
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
              <input
                id="password"
                name="password"
                type="password"
                className={`form-input${errors.password ? ' form-input--error' : ''}`}
                value={formValues.password}
                onChange={handleInputChange}
                onBlur={handleBlur}
                autoComplete="current-password"
                required
              />
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

            {submitError && (
              <div className="error-banner" role="alert" style={{ marginTop: '1rem' }}>
                <div className="error-banner-content">
                  <strong>Fehler:</strong> {submitError}
                </div>
              </div>
            )}

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
