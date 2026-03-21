import { Link, useNavigate } from 'react-router-dom';
import { useLoginForm } from '../hooks/useLoginForm';

function LoginPage() {
  const navigate = useNavigate();
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
      navigate('/');
    },
  });

  return (
    <div className="page">
      <h1 className="page-title">Login</h1>
      <p className="page-description">
        Melden Sie sich an, um geschuetzte Bereiche wie die Generierung und das Archiv zu nutzen.
      </p>

      <div className="page-form" style={{ maxWidth: '40rem' }}>
        <div className="card">
          <form className="form" onSubmit={handleSubmit} noValidate>
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
              {isLoading ? 'Login laeuft...' : 'Einloggen'}
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
