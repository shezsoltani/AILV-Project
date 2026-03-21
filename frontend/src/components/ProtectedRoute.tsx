// src/components/ProtectedRoute.tsx
// Schuetzt Seiten vor unberechtigtem Zugriff und leitet Gaeste auf die Login-Seite um
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Nicht eingeloggte Nutzer werden auf /login umgeleitet.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
