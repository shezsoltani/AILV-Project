// src/hooks/usePdfUpload.ts
// Kapselt die Logik und den State für das Hochladen von PDF-Dateien
import { useState } from 'react';
import { uploadPdf } from '../services/uploadApi';
import { getUserFriendlyMessage } from '../error-handling/errorMappers';

interface UsePdfUploadProps {
  onExtractedText: (text: string) => void;
}

export const usePdfUpload = ({ onExtractedText }: UsePdfUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wasTruncated, setWasTruncated] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
      setWasTruncated(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      // API-Call ausführen
      const response = await uploadPdf(file);
      setWasTruncated(response.was_truncated);
      // Callback der Eltern-Komponente auslösen
      onExtractedText(response.extracted_text);
    } catch (err: unknown) {
      setError(getUserFriendlyMessage(err));
      setWasTruncated(false);
    } finally {
      setLoading(false);
    }
  };

  return {
    file,
    loading,
    error,
    wasTruncated,
    handleFileChange,
    handleUpload,
  };
};
