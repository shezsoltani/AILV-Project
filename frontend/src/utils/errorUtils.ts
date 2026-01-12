// Extrahiert Fehlermeldung aus verschiedenen Error-Typen
export const extractErrorMessage = (error: unknown, defaultMessage: string): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return defaultMessage;
};
