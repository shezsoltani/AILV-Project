// src/App.tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute, GuestRoute } from './components/routing';
import { Layout } from './layout/Layout';
import { HomePage } from './pages/HomePage';
import { GeneratePage } from './pages/GeneratePage';
import { SlidesGeneratePage } from './pages/SlidesGeneratePage';
import { ArchivePage } from './pages/ArchivePage';
import { SlidesArchivePage } from './pages/SlidesArchivePage';
import { SlidesDeckDetailPage } from './pages/SlidesDeckDetailPage';
import { RegisterPage } from './pages/RegisterPage';
import { LoginPage } from './pages/LoginPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

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

