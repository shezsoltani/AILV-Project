import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../../components/ProtectedRoute';

const mockUseAuth = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('ProtectedRoute', () => {
  it('leitet nicht eingeloggte Nutzer auf /login um', () => {
    mockUseAuth.mockReturnValue({
      token: null,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/generate']}>
        <Routes>
          <Route
            path="/generate"
            element={
              <ProtectedRoute>
                <div>Geschützte Seite</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Seite</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Seite')).toBeInTheDocument();
  });

  it('zeigt die Seite fuer eingeloggte Nutzer an', () => {
    mockUseAuth.mockReturnValue({
      token: 'jwt-token',
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/generate']}>
        <Routes>
          <Route
            path="/generate"
            element={
              <ProtectedRoute>
                <div>Geschützte Seite</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Seite</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Geschützte Seite')).toBeInTheDocument();
  });
});
