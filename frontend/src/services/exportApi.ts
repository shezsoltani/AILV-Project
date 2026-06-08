// Kein apiCall-Wrapper hier – der wirft bei Blob-Antworten einen ParseError
import { API_BASE_URL } from './apiClient';

const AUTH_TOKEN_STORAGE_KEY = 'authToken';

// Blob in eine temporäre URL packen, Download auslösen und URL sofort wieder freigeben
function triggerBlobDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

// Authentifizierten GET-Request abschicken und die Antwort als Blob zurückgeben
async function fetchExport(url: string): Promise<Blob> {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: Export fehlgeschlagen.`;
    try {
      const errorBody = await response.json() as { detail?: string };
      if (errorBody.detail) {
        errorMessage = errorBody.detail;
      }
    } catch {
      // Fehler-Body lässt sich nicht als JSON lesen – generische Meldung reicht hier
    }
    throw new Error(errorMessage);
  }

  return response.blob();
}

// PDF-Export anstoßen und als Datei im Browser speichern
export async function exportJobAsPdf(jobId: string): Promise<void> {
  const url = `${API_BASE_URL}/api/jobs/${jobId}/export/pdf`;
  const blob = await fetchExport(url);
  triggerBlobDownload(blob, 'fragen_export.pdf');
}

// Moodle-XML-Export anstoßen und als Datei im Browser speichern
export async function exportJobAsMoodle(jobId: string): Promise<void> {
  const url = `${API_BASE_URL}/api/jobs/${jobId}/export/moodle`;
  const blob = await fetchExport(url);
  triggerBlobDownload(blob, 'fragen_moodle.xml');
}

// PPTX-Export anstoßen und als Datei im Browser speichern
export async function exportJobAsPptx(jobId: string): Promise<void> {
  const url = `${API_BASE_URL}/api/jobs/${jobId}/export/pptx`;
  const blob = await fetchExport(url);
  triggerBlobDownload(blob, 'folien_export.pptx');
}
