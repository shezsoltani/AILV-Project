import React from 'react';
import { Link } from 'react-router-dom';

const LoginPage: React.FC = () => {
  return (
    <div className="page">
      <h1 className="page-title">Login</h1>
      <p className="page-description">
        Die Login-Funktion folgt im naechsten Task. Die Registrierung war erfolgreich und
        hat Sie bereits hierher weitergeleitet.
      </p>

      <div className="page-form" style={{ maxWidth: '40rem' }}>
        <div className="card">
          <p className="form-helper" style={{ marginTop: 0, fontStyle: 'normal' }}>
            Als naechstes wird hier das eigentliche Login-Formular eingebaut.
          </p>
          <Link to="/register" className="secondary-button" style={{ display: 'inline-block' }}>
            Zurueck zur Registrierung
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
