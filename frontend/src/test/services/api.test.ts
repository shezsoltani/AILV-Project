import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateQuestions } from '../../services/api';

describe('API Services', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
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