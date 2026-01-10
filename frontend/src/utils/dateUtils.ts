// src/utils/dateUtils.ts
// Formatiert ISO-Datumsstring ins deutsche Format (z.B. "9. Jänner 2026 um 17:23")

export const formatDateToGerman = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('de-AT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};
