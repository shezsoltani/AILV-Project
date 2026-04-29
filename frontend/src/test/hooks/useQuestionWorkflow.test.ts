import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useQuestionWorkflow } from '../../hooks/questions/useQuestionWorkflow';
import * as api from '../../services/questionsApi';

// Wir mocken die API-Services komplett
vi.mock('../../services/questionsApi', () => ({
  generateQuestions: vi.fn(),
  finalizeQuestions: vi.fn(),
}));

describe('useQuestionWorkflow Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sollte Fragen in den State legen, wenn die Generierung erfolgreich ist', async () => {
    const mockResponse = {
      questions: [{ id: '1', question: 'Test?', type: 'MCQ', difficulty: 'easy' }],
      requestId: 'req-123'
    };

    (api.generateQuestions as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useQuestionWorkflow());

    await act(async () => {
      await result.current.handleFormSubmit({ topic: 'Test', language: 'de', count: 1, types: ['MCQ'], difficultyDistribution: { easy: 100, medium: 0, hard: 0 } });
    });

    // Erwartung: Fragen sind im State (die Page leitet daraus den Modal-Zustand ab)
    expect(result.current.questions).toHaveLength(1);
    expect(result.current.questions[0].question).toBe('Test?');
    expect(result.current.errorMessage).toBeNull();
  });

  it('sollte eine Fehlermeldung setzen und keine Fragen befüllen, wenn die API fehlschlägt', async () => {
    (api.generateQuestions as any).mockRejectedValue(new Error('Backend Fehler'));

    const { result } = renderHook(() => useQuestionWorkflow());

    await act(async () => {
      await result.current.handleFormSubmit({ topic: 'Test' } as any);
    });

    expect(result.current.errorMessage).toBe('Backend Fehler');
    expect(result.current.questions).toHaveLength(0);
  });
});