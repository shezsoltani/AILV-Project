import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JobContextProvider, useJobContext } from '../../context/JobContext';
import * as jobsApi from '../../services/jobsApi';

vi.mock('../../services/jobsApi', () => ({
  getJobStatus: vi.fn(),
  cancelJob: vi.fn(),
}));

describe('JobContext – Polling und Statusaktualisierung', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('pollt den Jobstatus erneut und aktualisiert Fortschritt', async () => {
    (jobsApi.getJobStatus as any)
      .mockResolvedValueOnce({
        job_id: 'job-poll-1',
        job_type: 'generate_questions',
        status: 'running',
        progress: 35,
        batch_current: 1,
        batch_total: 1,
        batch_retrying: false,
        stage_label: 'Schritt 1',
        result_data: null,
        error_message: null,
      })
      .mockResolvedValueOnce({
        job_id: 'job-poll-1',
        job_type: 'generate_questions',
        status: 'completed',
        progress: 100,
        batch_current: 1,
        batch_total: 1,
        batch_retrying: false,
        stage_label: 'Fertig',
        result_data: { request_id: 'req-1', questions: [] },
        error_message: null,
      });

    const { result } = renderHook(() => useJobContext(), {
      wrapper: JobContextProvider,
    });

    act(() => {
      result.current.addJob('job-poll-1', 'generate_questions');
    });

    expect(result.current.activeJob?.status).toBe('pending');
    expect(result.current.activeJob?.progress).toBe(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    await waitFor(() => {
      expect(result.current.activeJob?.status).toBe('running');
    });
    expect(result.current.activeJob?.progress).toBe(35);
    expect(result.current.activeJob?.stageLabel).toBe('Schritt 1');
    expect(jobsApi.getJobStatus).toHaveBeenCalledWith('job-poll-1');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    await waitFor(() => {
      expect(result.current.activeJob?.status).toBe('completed');
    });
    expect(result.current.activeJob?.progress).toBe(100);
    expect(result.current.activeJob?.resultData).toEqual({
      request_id: 'req-1',
      questions: [],
    });
  });

  it('markiert den Job als failed, wenn das Polling fehlschlaegt', async () => {
    (jobsApi.getJobStatus as any).mockRejectedValueOnce(new Error('Netzwerk weg'));

    const { result } = renderHook(() => useJobContext(), {
      wrapper: JobContextProvider,
    });

    act(() => {
      result.current.addJob('job-poll-fail', 'generate_slides');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    await waitFor(() => {
      expect(result.current.activeJob?.status).toBe('failed');
    });
    expect(result.current.activeJob?.errorMessage).toBe('Netzwerk weg');
  });

  it('stellt einen gespeicherten Job beim Laden erneut her', async () => {
    localStorage.setItem(
      'activeJobId',
      JSON.stringify({ jobId: 'job-restore', jobType: 'generate_questions' }),
    );
    (jobsApi.getJobStatus as any).mockResolvedValueOnce({
      job_id: 'job-restore',
      job_type: 'generate_questions',
      status: 'running',
      progress: 50,
      batch_current: 1,
      batch_total: 2,
      batch_retrying: false,
      stage_label: 'Batch laeuft',
      result_data: null,
      error_message: null,
    });

    const { result } = renderHook(() => useJobContext(), {
      wrapper: JobContextProvider,
    });

    await waitFor(() => {
      expect(result.current.activeJob?.jobId).toBe('job-restore');
    });
    expect(result.current.activeJob?.status).toBe('running');
    expect(result.current.activeJob?.progress).toBe(50);
    expect(result.current.activeJob?.stageLabel).toBe('Batch laeuft');
    expect(jobsApi.getJobStatus).toHaveBeenCalledWith('job-restore');
  });
});
