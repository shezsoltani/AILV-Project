import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateQuestions } from '../../services/questionsApi';
import { loginUser } from '../../services/authApi';

describe('API Services', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    localStorage.clear();
  });

  const validFormValues = {
    topic: 'React',
    language: 'de' as const,
    count: 5,
    types: ['MCQ'] as any,
    difficultyDistribution: { easy: 40, medium: 40, hard: 20 }
  };

  it('generateQuestions sollte den richtigen Endpunkt mit POST aufrufen', async () => {
    const mockResponse = { 
      accepted: true,
      questions: [], 
      request_id: '123' 
    };
    
    (fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      text: () => Promise.resolve(JSON.stringify(mockResponse)),
    });

    await generateQuestions(validFormValues);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/generate'),
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('sollte den gespeicherten Token automatisch als Authorization-Header mitsenden', async () => {
    const mockResponse = {
      accepted: true,
      questions: [],
      request_id: '123'
    };

    localStorage.setItem('authToken', 'mein-token');

    (fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      text: () => Promise.resolve(JSON.stringify(mockResponse)),
    });

    await generateQuestions(validFormValues);

    const requestOptions = (fetch as any).mock.calls[0][1];
    const headers = new Headers(requestOptions.headers);

    expect(headers.get('Authorization')).toBe('Bearer mein-token');
  });

  it('loginUser sollte den Login-Endpunkt mit Benutzername und Passwort aufrufen', async () => {
    const mockResponse = {
      access_token: 'jwt-token',
      token_type: 'bearer',
    };

    (fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      text: () => Promise.resolve(JSON.stringify(mockResponse)),
    });

    const result = await loginUser('max', 'geheim');

    expect(result.access_token).toBe('jwt-token');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/login'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          username: 'max',
          password: 'geheim',
        }),
      })
    );

    const requestOptions = (fetch as any).mock.calls[0][1];
    const headers = new Headers(requestOptions.headers);

    expect(headers.get('Authorization')).toBeNull();
  });

  it('sollte einen Fehler werfen, wenn der Server mit 500 antwortet', async () => {
    (fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Map(),
      text: () => Promise.resolve('Server kaputt'),
    });

    // Wir suchen nur nach dem Hauptteil der Fehlermeldung per Regex.
    // Das 'i' am Ende steht für case-insensitive (Groß-/Kleinschreibung egal).
    await expect(generateQuestions(validFormValues)).rejects.toThrow(/Server kaputt/i);
  });

});