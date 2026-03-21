import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import GuestRoute from '../../components/GuestRoute';

const mockUseAuth = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('GuestRoute', () => {
  it('leitet eingeloggte Nutzer auf die Startseite um', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route
            path="/login"
            element={
              <GuestRoute>
                <div>Login Seite</div>
              </GuestRoute>
            }
          />
          <Route path="/" element={<div>Startseite</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Startseite')).toBeInTheDocument();
  });

  it('zeigt die Seite fuer nicht eingeloggte Nutzer an', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route
            path="/login"
            element={
              <GuestRoute>
                <div>Login Seite</div>
              </GuestRoute>
            }
          />
          <Route path="/" element={<div>Startseite</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Seite')).toBeInTheDocument();
  });
});
