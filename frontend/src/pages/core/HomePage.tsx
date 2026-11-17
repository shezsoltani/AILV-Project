// Startseite - Die erste Seite, die Benutzer sehen
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileQuestion, Pencil, Presentation, Sparkles, Upload } from 'lucide-react';


export const HomePage: React.FC = () => {


  return (
    <div className="home">
      <header className="home-header">
        <h1 className="home-title">Was möchten Sie erstellen?</h1>
        <p className="home-description">
          Aus Ihren Unterlagen entstehen in wenigen Minuten Prüfungsfragen oder Folien,
          die Sie prüfen, bearbeiten und exportieren.
        </p>
      </header>

      <div className="home-tiles">
        <Link to="/generate" className="home-tile home-tile--primary">
          <span className="home-tile-icon"><FileQuestion aria-hidden="true" /></span>
          <span className="home-tile-text">
            <span className="home-tile-title">Prüfungsfragen</span>
            <span className="home-tile-description">
              Single Choice, Multiple Response, Kurzantwort oder Wahr/Falsch – aus einem Thema oder PDF.
            </span>
          </span>
          <ArrowRight className="home-tile-arrow" aria-hidden="true" />
        </Link>

        <Link to="/slides/generate" className="home-tile">
          <span className="home-tile-icon"><Presentation aria-hidden="true" /></span>
          <span className="home-tile-text">
            <span className="home-tile-title">Präsentationsfolien</span>
            <span className="home-tile-description">
              Strukturierte Folien zu Ihrem Thema, direkt bearbeitbar und exportierbar.
            </span>
          </span>
          <ArrowRight className="home-tile-arrow" aria-hidden="true" />
        </Link>
      </div>

      <ol className="home-flow" aria-label="So funktioniert's">
        <li><Upload aria-hidden="true" />Thema oder PDF angeben</li>
        <li><Sparkles aria-hidden="true" />Generieren lassen</li>
        <li><Pencil aria-hidden="true" />Prüfen und exportieren</li>
      </ol>
    </div>
  );
};
