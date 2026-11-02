import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cancelJob, getJobStatus } from '../../services/jobsApi';

describe('jobsApi', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    localStorage.clear();
  });

  it('getJobStatus ruft GET /api/jobs/{id} auf', async () => {
    const mockResponse = {
      job_id: 'job-1',
      job_type: 'generate_questions',
      status: 'running',
      progress: 40,
      batch_current: 1,
      batch_total: 1,
      batch_retrying: false,
      stage_label: 'Generierung',
      result_data: null,
      error_message: null,
    };

    (fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      text: () => Promise.resolve(JSON.stringify(mockResponse)),
    });

    const result = await getJobStatus('job-1');

    expect(result).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/jobs/job-1'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('cancelJob ruft DELETE /api/jobs/{id} auf', async () => {
    const mockResponse = {
      job_id: 'job-2',
      job_type: 'generate_slides',
      status: 'failed',
      progress: 10,
      batch_current: 1,
      batch_total: 1,
      batch_retrying: false,
      stage_label: null,
      result_data: null,
      error_message: 'abgebrochen',
    };

    (fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      text: () => Promise.resolve(JSON.stringify(mockResponse)),
    });

    const result = await cancelJob('job-2');

    expect(result.job_id).toBe('job-2');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/jobs/job-2'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('sendet den Auth-Token als Authorization-Header mit', async () => {
    localStorage.setItem('authToken', 'test-token');

    (fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      text: () =>
        Promise.resolve(
          JSON.stringify({
            job_id: 'job-3',
            job_type: 'generate_questions',
            status: 'pending',
            progress: 0,
            batch_current: 0,
            batch_total: 1,
            batch_retrying: false,
            stage_label: null,
            result_data: null,
            error_message: null,
          }),
        ),
    });

    await getJobStatus('job-3');

    const requestOptions = (fetch as any).mock.calls[0][1];
    const headers = new Headers(requestOptions.headers);
    expect(headers.get('Authorization')).toBe('Bearer test-token');
  });
});
