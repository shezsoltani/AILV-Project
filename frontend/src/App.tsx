// src/App.tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute, GuestRoute } from './components/routing';
import { Layout } from './layout/Layout';
import { HomePage } from './pages/core/HomePage';
import { GeneratePage } from './pages/questions/GeneratePage';
import { SlidesGeneratePage } from './pages/slides/SlidesGeneratePage';
import { ArchivePage } from './pages/questions/ArchivePage';
import { SlidesArchivePage } from './pages/slides/SlidesArchivePage';
import { SlidesDeckDetailPage } from './pages/slides/SlidesDeckDetailPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { LoginPage } from './pages/auth/LoginPage';
import { ChangePasswordPage } from './pages/auth/ChangePasswordPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

export const App: React.FC = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/generate"
          element={
            <ProtectedRoute>
              <GeneratePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/slides/generate"
          element={
            <ProtectedRoute>
              <SlidesGeneratePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/slides/archive"
          element={
            <ProtectedRoute>
              <SlidesArchivePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/slides/archive/:deckId"
          element={
            <ProtectedRoute>
              <SlidesDeckDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/archive"
          element={
            <ProtectedRoute>
              <ArchivePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePasswordPage />
            </ProtectedRoute>
          }
        />
        {/* Öffentliche Auth-Seiten ohne GuestRoute – auch für eingeloggte User zugänglich */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <RegisterPage />
            </GuestRoute>
          }
        />
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />
      </Routes>
    </Layout>
  );
};

