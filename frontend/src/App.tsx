import React from 'react';
import Layout from './layout/Layout';
import HomePage from './pages/HomePage';

const App: React.FC = () => {
  return (
    <Layout>
      <HomePage />
    </Layout>
  );
};

export default App;

