import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useQuestionWorkflow } from '../../hooks/questions/useQuestionWorkflow';
import { JobContextProvider } from '../../context/JobContext';
import * as api from '../../services/questionsApi';
import { ApiError } from '../../error-handling/AppErrors';

// Wir mocken die API-Services komplett
vi.mock('../../services/questionsApi', () => ({
  generateQuestions: vi.fn(),
  finalizeQuestions: vi.fn(),
}));

// Mock the JobContext
vi.mock('../../context/JobContext', () => {
  const React = require('react');
  const MockJobContext = React.createContext(null);

  const MockJobContextProvider = ({ children }: { children: React.ReactNode }) => {
    const [activeJob, setActiveJob] = React.useState<any>(null);

    const addJob = (jobId: string, jobType: string) => {
      if (jobId === 'job-failed') {
        setActiveJob({
          jobId,
          jobType,
          status: 'failed',
          progress: 0,
          errorMessage: 'Backend Fehler',
        });
      } else {
        setActiveJob({
          jobId,
          jobType,
          status: 'completed',
          progress: 100,
          resultData: {
            questions: [{ id: '1', question: 'Test?', type: 'MCQ', difficulty: 'easy' }],
            request_id: 'req-123',
          },
        });
      }
    };

    const dismissJob = () => setActiveJob(null);

    return React.createElement(MockJobContext.Provider, { value: { activeJob, addJob, dismissJob } }, children);
  };

  return {
    JobContextProvider: MockJobContextProvider,
    useJobContext: () => React.useContext(MockJobContext),
  };
});

describe('useQuestionWorkflow Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sollte Fragen in den State legen, wenn die Generierung erfolgreich ist', async () => {
    const mockResponse = {
      job_id: 'job-success',
    };

    (api.generateQuestions as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useQuestionWorkflow(), {
      wrapper: JobContextProvider,
    });

    await act(async () => {
      await result.current.handleFormSubmit({ topic: 'Test', language: 'de', count: 1, types: ['MCQ'], difficultyDistribution: { easy: 100, medium: 0, hard: 0 } });
    });

    // Erwartung: Fragen sind im State (die Page leitet daraus den Modal-Zustand ab)
    expect(result.current.questions).toHaveLength(1);
    expect(result.current.questions[0].question).toBe('Test?');
    expect(result.current.errorMessage).toBeNull();
  });


  it('übernimmt dieselbe LV-Auswahl beim Generieren und Finalisieren', async () => {
    (api.generateQuestions as any).mockResolvedValue({ job_id: 'job-course' });
    (api.finalizeQuestions as any).mockResolvedValue({ finalized_count: 1 });

    const { result } = renderHook(() => useQuestionWorkflow(), {
      wrapper: JobContextProvider,
    });

    const submittedValues = {
      topic: 'Test', language: 'de' as const, count: 1, types: ['MCQ' as const],
      difficultyDistribution: { easy: 100, medium: 0, hard: 0 },
      course_ids: ['lv-1', 'lv-2'],
    };
    await act(async () => { await result.current.handleFormSubmit(submittedValues); });
    // Spätere Änderungen am Formularobjekt dürfen den Auftragssnapshot nicht ändern.
    submittedValues.course_ids = ['lv-3'];

    expect(api.generateQuestions).toHaveBeenCalledWith(expect.objectContaining({ course_ids: ['lv-1', 'lv-2'] }));

    act(() => result.current.handleQuestionChange({ ...result.current.questions[0], question: 'Geändert?' }));
    await act(async () => { await result.current.handleFinalizeQuestions(); });

    expect(api.finalizeQuestions).toHaveBeenCalledWith(expect.objectContaining({
      request_id: 'req-123',
      course_ids: ['lv-1', 'lv-2'],
    }));
  });


  it('behält Entwürfe bei einem 404 der LV-Zuordnung und zeigt eine verständliche Meldung', async () => {
    (api.generateQuestions as any).mockResolvedValue({ job_id: 'job-course-404' });
    (api.finalizeQuestions as any).mockRejectedValue(new ApiError('Course not found', 404));

    const { result } = renderHook(() => useQuestionWorkflow(), { wrapper: JobContextProvider });
    await act(async () => {
      await result.current.handleFormSubmit({
        topic: 'Test', language: 'de', count: 1, types: ['MCQ'],
        difficultyDistribution: { easy: 100, medium: 0, hard: 0 }, course_ids: ['deleted-course'],
      });
    });
    act(() => result.current.handleQuestionChange({ ...result.current.questions[0], question: 'Geändert?' }));
    await act(async () => { await result.current.handleFinalizeQuestions(); });

    expect(result.current.questions).toHaveLength(1);
    expect(result.current.errorMessage).toContain('Es wurde nichts gespeichert');
  });

  it('sollte eine Fehlermeldung setzen und keine Fragen befüllen, wenn die API fehlschlägt', async () => {
    (api.generateQuestions as any).mockRejectedValue(new Error('Backend Fehler'));

    const { result } = renderHook(() => useQuestionWorkflow(), {
      wrapper: JobContextProvider,
    });

    await act(async () => {
      await result.current.handleFormSubmit({ topic: 'Test' } as any);
    });

    expect(result.current.errorMessage).toBe('Backend Fehler');
    expect(result.current.questions).toHaveLength(0);
  });
});