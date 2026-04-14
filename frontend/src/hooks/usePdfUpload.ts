// src/hooks/usePdfUpload.ts
// Kapselt die Logik und den State für das Hochladen von PDF-Dateien
import { useState } from 'react';
import { uploadPdf } from '../services/uploadApi';

interface UsePdfUploadProps {
  onExtractedText: (text: string) => void;
}

export const usePdfUpload = ({ onExtractedText }: UsePdfUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      // API-Call ausführen
      const extractedText = await uploadPdf(file);
      // Callback der Eltern-Komponente auslösen
      onExtractedText(extractedText);
    } catch (err: any) {
      setError(err.message || 'Ein Fehler ist beim Upload aufgetreten.');
    } finally {
      setLoading(false);
    }
  };

  return {
    file,
    loading,
    error,
    handleFileChange,
    handleUpload,
  };
};
