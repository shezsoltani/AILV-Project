// src/layout/Layout.tsx
// Layout-Komponente für die gesamte Anwendung (Header, Navigation, Inhalt)
import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [logoutPending, setLogoutPending] = useState(false);

  function handleLogoutRequest(): void {
    setLogoutPending(true);
  }

  function handleLogoutConfirm(): void {
    setLogoutPending(false);
    logout();
    navigate('/login');
  }

  function handleLogoutCancel(): void {
    setLogoutPending(false);
  }

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
                <NavLink
                  to="/generate"
                  className={function ({ isActive }) {
                    return 'app-nav-link' + (isActive ? ' app-nav-link--active' : '');
                  }}
                >
                  Fragen generieren
                </NavLink>
              </li>
              <li className="app-nav-item">
                <NavLink
                  to="/archive"
                  className={function ({ isActive }) {
                    return 'app-nav-link' + (isActive ? ' app-nav-link--active' : '');
                  }}
                >
                  Archiv
                </NavLink>
              </li>
            </ul>
            <div className="app-auth-actions">
              {isAuthenticated ? (
                <button type="button" className="app-auth-button" onClick={handleLogoutRequest}>
                  Logout
                </button>
              ) : (
                <>
                  <NavLink
                    to="/login"
                    className={function ({ isActive }) {
                      return 'app-nav-link' + (isActive ? ' app-nav-link--active' : '');
                    }}
                  >
                    Login
                  </NavLink>
                  <NavLink
                    to="/register"
                    className={function ({ isActive }) {
                      return 'app-nav-link' + (isActive ? ' app-nav-link--active' : '');
                    }}
                  >
                    Registrieren
                  </NavLink>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      {logoutPending && (
        <div
          className="logout-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-modal-title"
          onClick={handleLogoutCancel}
        >
          <div
            className="logout-modal"
            onClick={function (e) { e.stopPropagation(); }}
          >
            <div className="logout-modal-body">
              <h2 id="logout-modal-title" className="logout-modal-title">Abmelden</h2>
              <p className="logout-modal-description">
                Sind Sie sicher, dass Sie sich abmelden möchten?
              </p>
            </div>
            <div className="logout-modal-footer">
              <button
                type="button"
                className="logout-modal-cancel"
                onClick={handleLogoutCancel}
              >
                Abbrechen
              </button>
              <button
                type="button"
                className="logout-modal-confirm"
                onClick={handleLogoutConfirm}
              >
                Abmelden
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="app-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;

