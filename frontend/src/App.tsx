// src/App.tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './layout/Layout';
import HomePage from './pages/HomePage';
import GeneratePage from './pages/GeneratePage';
import ArchivePage from './pages/ArchivePage';

const App: React.FC = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/generate" element={<GeneratePage />} />
        <Route path="/archive" element={<ArchivePage />} />
      </Routes>
    </Layout>
  );
};

export default App;

