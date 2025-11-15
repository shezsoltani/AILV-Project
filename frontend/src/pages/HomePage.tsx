import React from 'react';

const HomePage: React.FC = () => {
  const handleGenerateClick = () => {
    console.log('Generate clicked');
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

