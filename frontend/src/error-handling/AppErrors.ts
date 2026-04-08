// Fehlertypen: gemeinsame Error-Klassen für konsistentes Frontend-Error-Handling
export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'APP_ERROR',
    public statusCode?: number
  ) {
    super(message);
    this.name = this.constructor.name;
    // Wichtig für korrektes `instanceof` in TypeScript/ES5 Targets
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// API-Fehler: Backend-Antworten mit 4xx/5xx Status
export class ApiError extends AppError {
  constructor(
    message: string,
    statusCode: number,
    code: string = 'API_ERROR',
    public endpoint?: string
  ) {
    super(message, code, statusCode);
  }
}

// Netzwerkfehler: Backend nicht erreichbar (fetch schlägt fehl)
export class NetworkError extends AppError {
  constructor(message: string = 'Netzwerkverbindung fehlgeschlagen') {
    super(message, 'NETWORK_ERROR');
  }
}

// Validierungsfehler: Client-seitige Formular-Validierung
export class ValidationError extends AppError {
  constructor(
    message: string,
    public validationErrors?: Record<string, string>
  ) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

// Parsing-Fehler: Response kann nicht als JSON gelesen werden
export class ParseError extends AppError {
  constructor(message: string = 'Antwort konnte nicht verarbeitet werden') {
    super(message, 'PARSE_ERROR');
  }
}
