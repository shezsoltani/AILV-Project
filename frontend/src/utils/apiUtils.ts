// src/utils/apiUtils.ts
// API-Helfer: Backend-HTTP-Fehler in konsistente ApiError-Objekte umwandeln
import { ApiError } from '../errors/AppErrors';

type FastApiValidationErrorItem = {
  loc?: Array<string | number>;
  msg?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFastApiValidationErrorItem(value: unknown): value is FastApiValidationErrorItem {
  if (!isRecord(value)) return false;
  const loc = value.loc;
  return loc === undefined || Array.isArray(loc);
}

export async function handleApiError(response: Response, endpoint?: string): Promise<never> {
  const contentType = response.headers.get('content-type') ?? '';
  const raw = await response.text().catch(() => '');

  const formatDetail = (detail: unknown): string | null => {
    if (typeof detail === 'string') return detail;
    if (!detail) return null;

    // FastAPI-Validierung: detail kann ein Array von { loc, msg, ... } sein
    if (Array.isArray(detail)) {
      const lines = detail
        .map((item) => {
          if (!isFastApiValidationErrorItem(item)) return null;
          const loc =
            Array.isArray(item.loc) && item.loc.length > 0
              ? item.loc.map(String).join('.')
              : null;
          const msg = typeof item.msg === 'string' ? item.msg : null;
          if (msg && loc) return `${loc}: ${msg}`;
          if (msg) return msg;
          return null;
        })
        .filter(Boolean) as string[];
      if (lines.length > 0) return lines.join(' | ');
    }

    // Fallback für Objekte/sonstige Typen
    try {
      return JSON.stringify(detail);
    } catch {
      return String(detail);
    }
  };

  if (contentType.includes('application/json')) {
    try {
      const errJson = JSON.parse(raw);
      const message =
        formatDetail(errJson?.detail) ||
        (typeof errJson?.message === 'string' && errJson.message) ||
        'Unbekannter Fehler';
      
      // Backend error_code verwenden (z.B. "archive_not_found")
      const errorCode = (typeof errJson?.error === 'string' && errJson.error) || 'API_ERROR';

      throw new ApiError(message, response.status, errorCode, endpoint);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      // JSON kaputt oder anders als erwartet -> Text verwenden
      const clean = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      throw new ApiError(
        clean || 'Ungültige JSON-Fehlerantwort',
        response.status,
        'INVALID_JSON_RESPONSE',
        endpoint
      );
    }
  }

  // Text/HTML-Fehler: grob bereinigen, damit kein Markup im Banner landet
  const clean = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  throw new ApiError(
    clean || response.statusText,
    response.status,
    'API_ERROR',
    endpoint
  );
}

