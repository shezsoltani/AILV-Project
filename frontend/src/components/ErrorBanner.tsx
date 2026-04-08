// src/components/ErrorBanner.tsx
// Rendert eine Fehlermeldung oder nichts. `role="alert"` für Screenreader.

import React from 'react';

interface ErrorBannerProps {
  message: string | null | undefined;
  style?: React.CSSProperties;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, style }) => {
  if (!message) return null;

  return (
    <div className="error-banner" role="alert" style={style}>
      <div className="error-banner-content">
        <strong>Fehler:</strong> {message}
      </div>
    </div>
  );
};
