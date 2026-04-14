// src/services/uploadApi.ts
import { API_BASE_URL, apiCall } from './apiClient';
import type { UploadPdfResponse } from '../types/api';

// Lädt eine PDF-Datei hoch und gibt den extrahierten Text zurück. 
export async function uploadPdf(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiCall<UploadPdfResponse>(`${API_BASE_URL}/api/upload/pdf`, {
    method: 'POST',
    body: formData,
  });

  return response.extracted_text;
}
