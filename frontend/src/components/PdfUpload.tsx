// src/components/PdfUpload.tsx
import React from 'react';
import { usePdfUpload } from '../hooks/usePdfUpload';
import { ErrorBanner } from './ErrorBanner';

interface PdfUploadProps {
  onExtractedText: (text: string) => void;
}

export const PdfUpload: React.FC<PdfUploadProps> = ({ onExtractedText }) => {
  // Komplette Logik ist im Hook gekapselt
  const { file, loading, error, handleFileChange, handleUpload } = usePdfUpload({ 
    onExtractedText 
  });

  return (
    <div className="pdf-upload-container" style={{ marginBottom: '1.5rem' }}>
      <p className="form-helper" style={{ marginBottom: '1rem', fontStyle: 'normal' }}>
        Optional: Wählen Sie eine PDF-Datei aus, um deren Inhalt als Kontext für die Fragengenerierung zu nutzen.
      </p>
      
      <ErrorBanner message={error} style={{ marginBottom: '1rem' }} />
      
      <div className="form-row">
        <label className="form-label" htmlFor="pdf-upload">
          PDF-Datei
        </label>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input 
            id="pdf-upload"
            type="file" 
            accept="application/pdf"
            onChange={handleFileChange}
            disabled={loading}
            className="form-input"
            style={{ flex: 1 }}
          />
          <button 
            type="button"
            onClick={handleUpload} 
            disabled={!file || loading}
            className="primary-button"
            style={{ whiteSpace: 'nowrap' }}
          >
            {loading ? 'Lade hoch...' : 'Hochladen'}
          </button>
        </div>
      </div>
    </div>
  );
};
