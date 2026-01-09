// Entfernt alle Zeichen außer Ziffern (0-9) aus einem String
export const sanitizeToDigitsOnly = (value: string): string => {
  return value.replace(/[^\d]/g, '');
};
