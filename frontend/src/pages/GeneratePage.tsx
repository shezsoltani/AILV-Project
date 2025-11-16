import React from 'react';
import { GenerateForm } from '../components/GenerateForm';

const GeneratePage: React.FC = () => {
  return (
    <div className="page">
      <h1 className="page-title">Fragen generieren</h1>
      <p className="page-description">
        Hier können Sie das Eingabeformular für die Generierung von Prüfungsfragen verwenden.
        Geben Sie Ihre Anforderungen ein und lassen Sie die KI passende Fragen erstellen.
      </p>
      <div className="page-form">
        <GenerateForm />
      </div>
    </div>
  );
};

export default GeneratePage;

