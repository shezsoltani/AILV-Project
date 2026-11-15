import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  exportArchiveAsMoodle,
  exportArchiveAsPdf,
  exportArchiveAsPdfExam,
  exportArchiveAsPptx,
  exportJobAsMoodle,
  exportJobAsPdf,
  exportJobAsPptx,
} from '../../services/exportApi';

describe('exportApi', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    localStorage.clear();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });

  function mockOkBlobResponse() {
    (fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(new Blob(['export-data'])),
    });
  }

  it('exportJobAsPdf ruft den Job-PDF-Endpunkt auf', async () => {
    mockOkBlobResponse();

    await exportJobAsPdf('job-1');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/jobs/job-1/export/pdf'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('exportArchiveAsPdf ruft den Archiv-PDF-Endpunkt auf', async () => {
    mockOkBlobResponse();

    await exportArchiveAsPdf('req-1');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/archive/req-1/export/pdf'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('exportArchiveAsPdfExam ruft den Archiv-Klausur-PDF-Endpunkt auf', async () => {
    mockOkBlobResponse();

    await exportArchiveAsPdfExam('req-1');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/archive/req-1/export/pdf/exam'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('exportJobAsMoodle ruft den Job-Moodle-Endpunkt auf', async () => {
    mockOkBlobResponse();

    await exportJobAsMoodle('job-1');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/jobs/job-1/export/moodle'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('exportArchiveAsMoodle ruft den Archiv-XML-Endpunkt auf', async () => {
    mockOkBlobResponse();

    await exportArchiveAsMoodle('req-1');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/archive/req-1/export/xml'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('exportJobAsPptx ruft den Job-PPTX-Endpunkt auf', async () => {
    mockOkBlobResponse();

    await exportJobAsPptx('job-1');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/jobs/job-1/export/pptx'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('exportArchiveAsPptx ruft den Archiv-PPTX-Endpunkt auf', async () => {
    mockOkBlobResponse();

    await exportArchiveAsPptx('deck-1');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/archive/deck-1/export/pptx'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('sendet Authorization-Header, wenn ein Token gespeichert ist', async () => {
    localStorage.setItem('authToken', 'token-123');
    mockOkBlobResponse();

    await exportArchiveAsPdf('req-1');

    const requestOptions = (fetch as any).mock.calls[0][1];
    expect(requestOptions.headers.Authorization).toBe('Bearer token-123');
  });

  it('wirft einen Fehler, wenn der Export fehlschlägt', async () => {
    (fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ detail: 'Export fehlgeschlagen.' }),
    });

    await expect(exportJobAsPdf('job-1')).rejects.toThrow('Export fehlgeschlagen.');
  });
});
