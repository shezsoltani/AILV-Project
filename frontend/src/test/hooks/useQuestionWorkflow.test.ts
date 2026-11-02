import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { useQuestionWorkflow } from '../../hooks/questions/useQuestionWorkflow';
import { JobContextProvider } from '../../context/JobContext';
import * as questionsApi from '../../services/questionsApi';
import * as jobsApi from '../../services/jobsApi';

vi.mock('../../services/questionsApi', () => ({
  generateQuestions: vi.fn(),
  finalizeQuestions: vi.fn(),
}));

vi.mock('../../services/jobsApi', () => ({
  getJobStatus: vi.fn(),
  cancelJob: vi.fn(),
}));

type MockJob = {
  jobId: string;
  jobType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  batchCurrent: number;
  batchTotal: number;
  batchRetrying: boolean;
  stageLabel: string | null;
  resultData: unknown | null;
  errorMessage: string | null;
};

const jobControls = vi.hoisted(() => {
  let setActiveJob: React.Dispatch<React.SetStateAction<MockJob | null>> | null = null;

  return {
    register(setter: React.Dispatch<React.SetStateAction<MockJob | null>>) {
      setActiveJob = setter;
    },
    setJob(job: MockJob | null) {
      setActiveJob?.(job);
    },
    updateJob(patch: Partial<MockJob>) {
      setActiveJob?.((previous) => (previous ? { ...previous, ...patch } : previous));
    },
    reset() {
      setActiveJob?.(null);
    },
  };
});

vi.mock('../../context/JobContext', () => {
  const ReactLib = require('react');
  const MockJobContext = ReactLib.createContext(null);

  function MockJobContextProvider({ children }: { children: React.ReactNode }) {
    const [activeJob, setActiveJob] = ReactLib.useState(null);

    ReactLib.useEffect(() => {
      jobControls.register(setActiveJob);
    }, []);

    const addJob = (jobId: string, jobType: string) => {
      setActiveJob({
        jobId,
        jobType,
        status: 'pending',
        progress: 0,
        batchCurrent: 0,
        batchTotal: 1,
        batchRetrying: false,
        stageLabel: null,
        resultData: null,
        errorMessage: null,
      });
    };

    const dismissJob = () => setActiveJob(null);

    return ReactLib.createElement(
      MockJobContext.Provider,
      { value: { activeJob, addJob, dismissJob } },
      children,
    );
  }

  return {
    JobContextProvider: MockJobContextProvider,
    useJobContext: () => ReactLib.useContext(MockJobContext),
  };
});

const formValues = {
  topic: 'Datenbanken',
  language: 'de' as const,
  count: 2,
  types: ['SCQ'] as any,
  difficultyDistribution: { easy: 100, medium: 0, hard: 0 },
};

const completedQuestions = [
  {
    id: '1',
    question: 'Was ist ein Primaerschluessel?',
    type: 'SCQ',
    difficulty: 'easy',
  },
];

describe('useQuestionWorkflow Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    jobControls.reset();
  });

  it('startet die Fragensgenerierung und registriert den Job', async () => {
    (questionsApi.generateQuestions as any).mockResolvedValue({
      job_id: 'job-q-1',
      status: 'pending',
    });

    const { result } = renderHook(() => useQuestionWorkflow(), {
      wrapper: JobContextProvider,
    });

    await act(async () => {
      await result.current.handleFormSubmit(formValues);
    });

    expect(questionsApi.generateQuestions).toHaveBeenCalledWith(formValues);
    expect(result.current.jobId).toBe('job-q-1');
    expect(result.current.jobStatus).toBe('pending');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.questions).toHaveLength(0);
    expect(result.current.errorMessage).toBeNull();
  });

  it('zeigt Lade- und Fortschrittszustand waehrend der Job laeuft', async () => {
    (questionsApi.generateQuestions as any).mockResolvedValue({
      job_id: 'job-q-progress',
      status: 'pending',
    });

    const { result } = renderHook(() => useQuestionWorkflow(), {
      wrapper: JobContextProvider,
    });

    await act(async () => {
      await result.current.handleFormSubmit(formValues);
    });

    await act(async () => {
      jobControls.updateJob({
        status: 'running',
        progress: 40,
        stageLabel: 'Fragen werden generiert',
      });
    });

    expect(result.current.jobStatus).toBe('running');
    expect(result.current.jobProgress).toBe(40);
    expect(result.current.jobStageLabel).toBe('Fragen werden generiert');
    expect(result.current.questions).toHaveLength(0);
  });

  it('legt Fragen in den State, wenn der Job erfolgreich abgeschlossen ist', async () => {
    (questionsApi.generateQuestions as any).mockResolvedValue({
      job_id: 'job-q-success',
      status: 'pending',
    });

    const { result } = renderHook(() => useQuestionWorkflow(), {
      wrapper: JobContextProvider,
    });

    await act(async () => {
      await result.current.handleFormSubmit(formValues);
    });

    await act(async () => {
      jobControls.updateJob({
        status: 'completed',
        progress: 100,
        stageLabel: 'Fertig',
        resultData: {
          request_id: 'req-123',
          questions: completedQuestions,
        },
      });
    });

    await waitFor(() => {
      expect(result.current.questions).toHaveLength(1);
    });
    expect(result.current.questions[0].question).toBe('Was ist ein Primaerschluessel?');
    expect(result.current.requestId).toBe('req-123');
    expect(result.current.errorMessage).toBeNull();
  });

  it('setzt eine sichtbare Fehlermeldung, wenn der Job fehlschlaegt', async () => {
    (questionsApi.generateQuestions as any).mockResolvedValue({
      job_id: 'job-q-failed',
      status: 'pending',
    });

    const { result } = renderHook(() => useQuestionWorkflow(), {
      wrapper: JobContextProvider,
    });

    await act(async () => {
      await result.current.handleFormSubmit(formValues);
    });

    await act(async () => {
      jobControls.updateJob({
        status: 'failed',
        progress: 10,
        errorMessage: 'LLM-Timeout',
        resultData: null,
      });
    });

    await waitFor(() => {
      expect(result.current.errorMessage).toBe('LLM-Timeout');
    });
    expect(result.current.questions).toHaveLength(0);
  });

  it('setzt eine Fehlermeldung, wenn der Start-API-Aufruf fehlschlaegt', async () => {
    (questionsApi.generateQuestions as any).mockRejectedValue(new Error('Backend Fehler'));

    const { result } = renderHook(() => useQuestionWorkflow(), {
      wrapper: JobContextProvider,
    });

    await act(async () => {
      await result.current.handleFormSubmit(formValues);
    });

    expect(result.current.errorMessage).toBe('Backend Fehler');
    expect(result.current.questions).toHaveLength(0);
    expect(result.current.jobId).toBeNull();
  });

  it('bricht einen laufenden Job ab und raeumt den State auf', async () => {
    (questionsApi.generateQuestions as any).mockResolvedValue({
      job_id: 'job-q-cancel',
      status: 'pending',
    });
    (jobsApi.cancelJob as any).mockResolvedValue({
      job_id: 'job-q-cancel',
      status: 'failed',
    });

    const { result } = renderHook(() => useQuestionWorkflow(), {
      wrapper: JobContextProvider,
    });

    await act(async () => {
      await result.current.handleFormSubmit(formValues);
    });

    await act(async () => {
      jobControls.updateJob({ status: 'running', progress: 20 });
    });

    await act(async () => {
      await result.current.cancelGeneration();
    });

    expect(jobsApi.cancelJob).toHaveBeenCalledWith('job-q-cancel');
    expect(result.current.jobId).toBeNull();
    expect(result.current.questions).toHaveLength(0);
  });
});
