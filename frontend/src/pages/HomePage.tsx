// Startseite - Die erste Seite, die Benutzer sehen
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="home">
      <div className="card">
        <h1 className="home-title">Prüfungsfragen-Generator für Lehrende</h1>
        <p className="home-description">
          Erstellen Sie schnell und einfach Prüfungsfragen für Ihre Lehrveranstaltungen.
          Nutzen Sie die Kraft der KI, um maßgeschneiderte Fragen zu generieren.
        </p>
        <div className="home-actions">
          <Link to="/generate" className="primary-button">
            Fragen generieren
          </Link>
          {isAuthenticated ? (
            <Link to="/archive" className="secondary-button">
              Mein Archiv
            </Link>
          ) : (
            <Link to="/register" className="secondary-button">
              Registrieren
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;

