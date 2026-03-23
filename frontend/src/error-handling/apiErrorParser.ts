// Parst HTTP-Fehlerantworten vom Backend in konsistente ApiError-Objekte.
import { ApiError } from './AppErrors';

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

function formatDetail(detail: unknown): string | null {
  if (typeof detail === 'string') return detail;
  if (!detail) return null;

  if (isRecord(detail) && typeof detail.message === 'string') {
    return detail.message;
  }

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

  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

export async function handleApiError(response: Response, endpoint?: string): Promise<never> {
  const contentType = response.headers.get('content-type') ?? '';
  const raw = await response.text().catch(() => '');

  if (contentType.includes('application/json')) {
    try {
      const errJson = JSON.parse(raw);
      const detail = errJson?.detail;
      const message =
        formatDetail(detail) ||
        (typeof errJson?.message === 'string' && errJson.message) ||
        'Unbekannter Fehler';

      const detailCode = isRecord(detail) && typeof detail.code === 'string' ? detail.code : null;
      const isValidationArray = Array.isArray(detail);
      const errorCode =
        (typeof errJson?.error === 'string' && errJson.error) ||
        detailCode ||
        (response.status === 422 && isValidationArray ? 'validation_error' : null) ||
        'API_ERROR';

      throw new ApiError(message, response.status, errorCode, endpoint);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      const clean = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      throw new ApiError(
        clean || 'Ungültige JSON-Fehlerantwort',
        response.status,
        'INVALID_JSON_RESPONSE',
        endpoint
      );
    }
  }

  // Text/HTML-Fehler: Markup entfernen, damit kein HTML im Banner landet
  const clean = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  throw new ApiError(
    clean || response.statusText,
    response.status,
    'API_ERROR',
    endpoint
  );
}
