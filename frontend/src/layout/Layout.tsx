// src/layout/Layout.tsx
// Layout-Komponente für die gesamte Anwendung (Header, Navigation, Inhalt)
import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog } from '../components/shared';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [logoutPending, setLogoutPending] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
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
                AI-gestützter Lehrunterlagen-Generator für Lehrende
              </p>
            </div>
          </Link>
          <nav className="app-nav">
            <ul className="app-nav-list">
              <li className="app-nav-item app-nav-dropdown">
                <button type="button" className="app-nav-link app-nav-dropdown-trigger">
                  Fragen
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                <div className="app-nav-dropdown-menu">
                  <NavLink
                    to="/generate"
                    className={function ({ isActive }) {
                      return 'app-nav-dropdown-item' + (isActive ? ' app-nav-dropdown-item--active' : '');
                    }}
                  >
                    Neu generieren
                  </NavLink>
                  <NavLink
                    to="/archive"
                    className={function ({ isActive }) {
                      return 'app-nav-dropdown-item' + (isActive ? ' app-nav-dropdown-item--active' : '');
                    }}
                  >
                    Archiv
                  </NavLink>
                </div>
              </li>
              <li className="app-nav-item app-nav-dropdown">
                <button type="button" className="app-nav-link app-nav-dropdown-trigger">
                  Folien
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                <div className="app-nav-dropdown-menu">
                  <NavLink
                    to="/slides/generate"
                    className={function ({ isActive }) {
                      return 'app-nav-dropdown-item' + (isActive ? ' app-nav-dropdown-item--active' : '');
                    }}
                  >
                    Neu generieren
                  </NavLink>
                  <NavLink
                    to="/slides/archive"
                    className={function ({ isActive }) {
                      return 'app-nav-dropdown-item' + (isActive ? ' app-nav-dropdown-item--active' : '');
                    }}
                  >
                    Archiv
                  </NavLink>
                </div>
              </li>
            </ul>
            <div className="app-auth-actions">
              {isAuthenticated ? (
                <div className="profile-dropdown" ref={profileRef}>
                  <button 
                    type="button" 
                    className="profile-dropdown-btn"
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    aria-expanded={isProfileOpen}
                    aria-label="Profilmenü"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </button>
                  {isProfileOpen && (
                    <div className="profile-dropdown-menu">
                      <NavLink
                        to="/change-password"
                        className={function ({ isActive }) {
                          return 'profile-dropdown-item' + (isActive ? ' profile-dropdown-item--active' : '');
                        }}
                        onClick={() => setIsProfileOpen(false)}
                      >
                        Passwort ändern
                      </NavLink>
                      <div className="profile-dropdown-divider"></div>
                      <button 
                        type="button" 
                        className="profile-dropdown-item profile-dropdown-item--danger" 
                        onClick={() => {
                          setIsProfileOpen(false);
                          handleLogoutRequest();
                        }}
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
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

      <ConfirmDialog
        isOpen={logoutPending}
        title="Abmelden"
        description="Sind Sie sicher, dass Sie sich abmelden möchten?"
        confirmLabel="Abmelden"
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
      />

      <main className="app-content">
        {children}
      </main>
    </div>
  );
};

