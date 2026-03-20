// Startseite - Die erste Seite, die Benutzer sehen
import React from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  // Hook zum Navigieren zwischen Seiten
  const navigate = useNavigate();

  // Wenn der Button geklickt wird, wechseln wir zur Generierungsseite
  const handleGenerateClick = () => {
    navigate('/generate');
  };

  const handleRegisterClick = () => {
    navigate('/register');
  };

  return (
    <div className="home">
      <div className="card">
        <h1 className="home-title">Prüfungsfragen-Generator für Lehrende</h1>
        <p className="home-description">
          Erstellen Sie schnell und einfach Prüfungsfragen für Ihre Lehrveranstaltungen.
          Nutzen Sie die Kraft der KI, um maßgeschneiderte Fragen zu generieren.
        </p>
        <div className="home-actions">
          <button className="primary-button" onClick={handleGenerateClick}>
            Fragen generieren
          </button>
          <button className="secondary-button" onClick={handleRegisterClick}>
            Registrieren
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;

