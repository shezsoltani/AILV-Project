// src/layout/Layout.tsx
// Layout-Komponente für die gesamte Anwendung (Header, Navigation, Inhalt)
import React from 'react';
import { Link } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/" className="app-brand" aria-label="Zur Startseite">
            <div>
              <h1 className="app-header-title">AI-LV Assistant</h1>
              <p className="app-header-subtitle">
                AI-gestützter Prüfungsfragen-Generator für Lehrende
              </p>
            </div>
          </Link>
          <nav className="app-nav">
            <ul className="app-nav-list">
              <li className="app-nav-item">
                <Link to="/generate" className="app-nav-link">
                  Fragen generieren
                </Link>
              </li>
              <li className="app-nav-item">
                <Link to="/archive" className="app-nav-link">
                  Archiv
                </Link>
              </li>
            </ul>
            <div className="app-auth-actions">
              <Link to="/login" className="app-nav-link">
                Login
              </Link>
              <Link to="/register" className="app-auth-button">
                Registrieren
              </Link>
            </div>
          </nav>
        </div>
      </header>
      <main className="app-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;

