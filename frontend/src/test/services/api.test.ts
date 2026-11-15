import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateQuestions,
  getArchiveTopics,
  getArchiveQuestions,
  updateArchiveQuestions,
} from '../../services/questionsApi';
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

  it('generateQuestions sollte den richtigen Endpunkt mit POST aufrufen und job_id zurueckgeben', async () => {
    const mockResponse = {
      job_id: 'job-123',
      status: 'pending',
    };

    (fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      text: () => Promise.resolve(JSON.stringify(mockResponse)),
    });

    const result = await generateQuestions(validFormValues);

    expect(result).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/generate'),
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('sollte den gespeicherten Token automatisch als Authorization-Header mitsenden', async () => {
    const mockResponse = {
      job_id: 'job-123',
      status: 'pending',
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

  it('getArchiveTopics lädt archivierte Themen', async () => {
    const mockResponse = {
      topics: [
        {
          request_id: 'req-1',
          topic: 'Datenbanken',
          language: 'de',
          question_count: 2,
          types: ['SCQ'],
          created_at: '2026-01-10T10:00:00Z',
          finalized_at: '2026-01-10T11:00:00Z',
        },
      ],
    };

    (fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      text: () => Promise.resolve(JSON.stringify(mockResponse)),
    });

    const result = await getArchiveTopics();

    expect(result).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/archive/topics'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('getArchiveQuestions lädt Fragen eines Archiv-Themas', async () => {
    const mockResponse = {
      request_id: 'req-1',
      topic: 'Datenbanken',
      language: 'de',
      questions: [
        {
          id: 'q1',
          question: 'Was ist ein Primärschlüssel?',
          type: 'SHORT_ANSWER',
          difficulty: 'easy',
          answer: 'UUID',
        },
      ],
    };

    (fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      text: () => Promise.resolve(JSON.stringify(mockResponse)),
    });

    const result = await getArchiveQuestions('req-1');

    expect(result).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/archive/req-1/questions'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('updateArchiveQuestions speichert bearbeitete Fragen', async () => {
    const questions = [
      {
        id: 'q1',
        question: 'Was ist ein Primärschlüssel?',
        type: 'SHORT_ANSWER' as const,
        difficulty: 'easy' as const,
        answer: 'Neue Antwort',
      },
    ];
    const mockResponse = {
      request_id: 'req-1',
      topic: 'Datenbanken',
      language: 'de',
      questions,
    };

    (fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      text: () => Promise.resolve(JSON.stringify(mockResponse)),
    });

    const result = await updateArchiveQuestions('req-1', questions);

    expect(result).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/archive/req-1/questions'),
      expect.objectContaining({ method: 'PUT' }),
    );
  });

});
