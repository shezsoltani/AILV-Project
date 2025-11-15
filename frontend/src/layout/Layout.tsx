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
          <div>
            <h1 className="app-header-title">AI-LV Assistant</h1>
            <p className="app-header-subtitle">
              AI-gestützter Prüfungsfragen-Generator für Lehrende
            </p>
          </div>
          <nav className="app-nav">
            <ul className="app-nav-list">
              <li className="app-nav-item">
                <Link to="/" className="app-nav-link">
                  Start
                </Link>
              </li>
              <li className="app-nav-item">
                <Link to="/generate" className="app-nav-link">
                  Fragen generieren
                </Link>
              </li>
            </ul>
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

