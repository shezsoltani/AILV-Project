import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useQuestionWorkflow } from '../../hooks/useQuestionWorkflow';
import * as api from '../../services/api';

// Wir mocken die API-Services komplett
vi.mock('../../services/api', () => ({
  generateQuestions: vi.fn(),
  finalizeQuestions: vi.fn(),
}));

describe('useQuestionWorkflow Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sollte das Modal öffnen und Fragen speichern, wenn die Generierung erfolgreich ist', async () => {
    const mockResponse = {
      questions: [{ id: '1', question: 'Test?', type: 'MCQ', difficulty: 'easy' }],
      requestId: 'req-123'
    };
    
    // Wir sagen dem Mock, was er zurückgeben soll
    (api.generateQuestions as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useQuestionWorkflow());

    // Aktion: Formular absenden
    await act(async () => {
      await result.current.handleFormSubmit({ topic: 'Test', language: 'de', count: 1, types: ['MCQ'], difficultyDistribution: { easy: 100, medium: 0, hard: 0 } });
    });

    // Erwartung: Modal ist offen und Fragen sind im State
    expect(result.current.isModalOpen).toBe(true);
    expect(result.current.questions).toHaveLength(1);
    expect(result.current.questions[0].question).toBe('Test?');
  });

  it('sollte eine Fehlermeldung setzen, wenn die API fehlschlägt', async () => {
    (api.generateQuestions as any).mockRejectedValue(new Error('Backend Fehler'));

    const { result } = renderHook(() => useQuestionWorkflow());

    await act(async () => {
      await result.current.handleFormSubmit({ topic: 'Test' } as any);
    });

    expect(result.current.errorMessage).toBe('Backend Fehler');
    expect(result.current.isModalOpen).toBe(false);
  });
});