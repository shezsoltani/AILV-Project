import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="app-layout">
      <header className="app-header">
        <h1 className="app-header-title">AI-LV Assistant</h1>
        <p className="app-header-subtitle">
          AI-gestützter Prüfungsfragen-Generator für Lehrende
        </p>
      </header>
      <main className="app-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;

