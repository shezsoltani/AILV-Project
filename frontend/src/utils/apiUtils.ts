// Wandelt Backend-Fehler in lesbare Fehlermeldungen um
export async function handleApiError(response: Response): Promise<never> {
  const contentType = response.headers.get('content-type') ?? '';
  const raw = await response.text().catch(() => '');

  // Versuche zuerst JSON-Fehler zu lesen
  if (contentType.includes('application/json')) {
    try {
      const errJson = JSON.parse(raw);
      const message =
        (typeof errJson?.message === 'string' && errJson.message) ||
        (typeof errJson?.detail === 'string' && errJson.detail) ||
        'Unbekannter Fehler';

      throw new Error(`Backend-Fehler (${response.status}): ${message}`);
    } catch (error) {
      // Wenn JSON-Parsing fehlschlägt, verwende Text-Version
      if (error instanceof Error && error.message.startsWith('Backend-Fehler')) {
        throw error;
      }
      const clean = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      throw new Error(
        `Backend-Fehler (${response.status})` +
        (clean ? `: ${clean.slice(0, 300)}` : ': Ungültige JSON-Fehlerantwort'),
      );
    }
  }

  // Bei Text-Fehlern HTML-Tags entfernen und aufräumen
  const clean = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  throw new Error(
    `Backend-Fehler (${response.status} ${response.statusText})` +
      (clean ? `: ${clean.slice(0, 300)}` : ''),
  );
}

