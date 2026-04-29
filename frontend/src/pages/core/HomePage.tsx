// Startseite - Die erste Seite, die Benutzer sehen
import React from 'react';
import { Link } from 'react-router-dom';


export const HomePage: React.FC = () => {


  return (
    <div className="home">
      <div className="card">
        <h1 className="home-title">Lehrunterlagen-Generator</h1>
        <p className="home-description">
          Erstellen Sie schnell und einfach Prüfungsfragen und Präsentationsfolien für Ihre Lehrveranstaltungen.
          Nutzen Sie die Kraft der KI, um maßgeschneiderte Lehrunterlagen zu generieren.
        </p>
        <div className="home-actions">
          <Link to="/generate" className="primary-button">
            Fragen generieren
          </Link>
          <Link to="/slides/generate" className="secondary-button">
            Folien generieren
          </Link>
        </div>
      </div>
    </div>
  );
};

