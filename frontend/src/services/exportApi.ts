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

// Klausur-PDF (ohne Lösungen) für einen frisch generierten Job exportieren
export async function exportJobAsPdfExam(jobId: string): Promise<void> {
  const url = `${API_BASE_URL}/api/jobs/${jobId}/export/pdf/exam`;
  const blob = await fetchExport(url);
  triggerBlobDownload(blob, 'klausur_export.pdf');
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

// PDF-Export für einen archivierten Eintrag (nutzt request_id statt job_id)
export async function exportArchiveAsPdf(requestId: string): Promise<void> {
  const url = `${API_BASE_URL}/api/archive/${requestId}/export/pdf`;
  const blob = await fetchExport(url);
  triggerBlobDownload(blob, 'fragen_export.pdf');
}

// Klausur-PDF (ohne Lösungen) für einen archivierten Eintrag exportieren
export async function exportArchiveAsPdfExam(requestId: string): Promise<void> {
  const url = `${API_BASE_URL}/api/archive/${requestId}/export/pdf/exam`;
  const blob = await fetchExport(url);
  triggerBlobDownload(blob, 'klausur_export.pdf');
}

// Moodle-XML-Export für einen archivierten Eintrag
export async function exportArchiveAsMoodle(requestId: string): Promise<void> {
  const url = `${API_BASE_URL}/api/archive/${requestId}/export/xml`;
  const blob = await fetchExport(url);
  triggerBlobDownload(blob, 'fragen_moodle.xml');
}

// PPTX-Export für einen archivierten Eintrag (Foliendeck)
export async function exportArchiveAsPptx(requestId: string): Promise<void> {
  const url = `${API_BASE_URL}/api/archive/${requestId}/export/pptx`;
  const blob = await fetchExport(url);
  triggerBlobDownload(blob, 'folien_export.pptx');
}

