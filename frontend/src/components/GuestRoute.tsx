// src/components/GuestRoute.tsx
// Leitet eingeloggte Nutzer von Gaest-Seiten (Login, Registrierung) auf die Startseite um
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface GuestRouteProps {
  children: React.ReactNode;
}

export default function GuestRoute({ children }: GuestRouteProps) {
  const { isAuthenticated } = useAuth();

  // Bereits eingeloggte Nutzer brauchen diese Seite nicht mehr.
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
