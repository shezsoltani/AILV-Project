import React from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const handleGenerateClick = () => {
    navigate('/generate');
  };

  return (
    <div className="home">
      <h1 className="home-title">Prüfungsfragen-Generator für Lehrende</h1>
      <p className="home-description">
        Erstellen Sie schnell und einfach Prüfungsfragen für Ihre Lehrveranstaltungen.
        Nutzen Sie die Kraft der KI, um maßgeschneiderte Fragen zu generieren.
      </p>
      <div className="home-actions">
        <button className="primary-button" onClick={handleGenerateClick}>
          Fragen generieren
        </button>
      </div>
    </div>
  );
};

export default HomePage;

