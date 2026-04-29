// src/components/shared/PdfUpload.tsx
import React from 'react';
import { usePdfUpload } from '../../hooks/shared/usePdfUpload';
import { ErrorBanner } from './ErrorBanner';

interface PdfUploadProps {
  onExtractedText: (text: string) => void;
}

export const PdfUpload: React.FC<PdfUploadProps> = ({ onExtractedText }) => {
  // Komplette Logik ist im Hook gekapselt
  const { file, loading, error, wasTruncated, handleFileChange, handleUpload } = usePdfUpload({
    onExtractedText 
  });

  return (
    <div className="pdf-upload-container">
      <p className="form-helper form-helper--normal">
        Optional: Wählen Sie eine PDF-Datei aus, um deren Inhalt als Kontext für die Fragengenerierung zu nutzen.
      </p>
      
      <ErrorBanner message={error} />
      {wasTruncated && (
        <div className="warning-banner" role="status">
          Der PDF-Text wurde auf 5.000 Zeichen gekürzt.
        </div>
      )}
      
      <div className="form-row">
        <label className="form-label" htmlFor="pdf-upload">
          PDF-Datei
        </label>
        <div className="pdf-upload-actions">
          <input 
            id="pdf-upload"
            type="file" 
            accept="application/pdf"
            onChange={handleFileChange}
            disabled={loading}
            className="form-input pdf-upload-input"
          />
          <button 
            type="button"
            onClick={handleUpload} 
            disabled={!file || loading}
            className="primary-button pdf-upload-button"
          >
            {loading ? 'Lade hoch...' : 'Hochladen'}
          </button>
        </div>
      </div>
    </div>
  );
};
