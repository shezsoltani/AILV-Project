import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ExportDropdownButton,
  MoodleExportButton,
  SlidesExportDropdownButton,
} from '../../components/shared/ExportButtons';
import * as exportApi from '../../services/exportApi';

vi.mock('../../services/exportApi', () => ({
  exportJobAsPdf: vi.fn(),
  exportArchiveAsPdf: vi.fn(),
  exportJobAsPdfExam: vi.fn(),
  exportArchiveAsPdfExam: vi.fn(),
  exportJobAsMoodle: vi.fn(),
  exportArchiveAsMoodle: vi.fn(),
  exportJobAsPptx: vi.fn(),
  exportArchiveAsPptx: vi.fn(),
}));

describe('ExportButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (exportApi.exportArchiveAsPdf as any).mockResolvedValue(undefined);
    (exportApi.exportArchiveAsPdfExam as any).mockResolvedValue(undefined);
    (exportApi.exportArchiveAsMoodle as any).mockResolvedValue(undefined);
    (exportApi.exportJobAsPdf as any).mockResolvedValue(undefined);
    (exportApi.exportJobAsMoodle as any).mockResolvedValue(undefined);
    (exportApi.exportArchiveAsPptx as any).mockResolvedValue(undefined);
    (exportApi.exportJobAsPptx as any).mockResolvedValue(undefined);
  });

  it('startet Archiv-PDF-Export über exportArchiveAsPdf', async () => {
    render(<ExportDropdownButton jobId="req-1" mode="archive" />);

    fireEvent.click(screen.getByRole('button', { name: /Exportieren/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Als PDF exportieren/i }));

    await waitFor(() => {
      expect(exportApi.exportArchiveAsPdf).toHaveBeenCalledWith('req-1');
    });
    expect(exportApi.exportJobAsPdf).not.toHaveBeenCalled();
  });

  it('startet Archiv-Moodle-Export über exportArchiveAsMoodle', async () => {
    render(<ExportDropdownButton jobId="req-1" mode="archive" />);

    fireEvent.click(screen.getByRole('button', { name: /Exportieren/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Als Moodle XML exportieren/i }));

    await waitFor(() => {
      expect(exportApi.exportArchiveAsMoodle).toHaveBeenCalledWith('req-1');
    });
    expect(exportApi.exportJobAsMoodle).not.toHaveBeenCalled();
  });

  it('startet Archiv-Klausur-PDF-Export über exportArchiveAsPdfExam', async () => {
    render(<ExportDropdownButton jobId="req-1" mode="archive" />);

    fireEvent.click(screen.getByRole('button', { name: /Exportieren/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Als Klausur-PDF exportieren/i }));

    await waitFor(() => {
      expect(exportApi.exportArchiveAsPdfExam).toHaveBeenCalledWith('req-1');
    });
    expect(exportApi.exportJobAsPdfExam).not.toHaveBeenCalled();
  });

  it('startet Job-PDF-Export über exportJobAsPdf im Job-Modus', async () => {
    render(<ExportDropdownButton jobId="job-1" mode="job" />);

    fireEvent.click(screen.getByRole('button', { name: /Exportieren/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Als PDF exportieren/i }));

    await waitFor(() => {
      expect(exportApi.exportJobAsPdf).toHaveBeenCalledWith('job-1');
    });
    expect(exportApi.exportArchiveAsPdf).not.toHaveBeenCalled();
  });

  it('zeigt Exportfehler sichtbar an', async () => {
    (exportApi.exportArchiveAsMoodle as any).mockRejectedValue(
      new Error('Export fehlgeschlagen.'),
    );

    render(<MoodleExportButton jobId="req-1" mode="archive" />);

    fireEvent.click(screen.getByRole('button', { name: /Als Moodle XML exportieren/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Export fehlgeschlagen/i);
    });
  });

  it('startet Archiv-PPTX-Export über exportArchiveAsPptx', async () => {
    render(<SlidesExportDropdownButton jobId="deck-1" mode="archive" />);

    fireEvent.click(screen.getByRole('button', { name: /Exportieren/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Als PPTX exportieren/i }));

    await waitFor(() => {
      expect(exportApi.exportArchiveAsPptx).toHaveBeenCalledWith('deck-1');
    });
    expect(exportApi.exportJobAsPptx).not.toHaveBeenCalled();
  });

  it('zeigt PPTX-Exportfehler sichtbar an', async () => {
    (exportApi.exportArchiveAsPptx as any).mockRejectedValue(
      new Error('PPTX-Export fehlgeschlagen.'),
    );

    render(<SlidesExportDropdownButton jobId="deck-1" mode="archive" />);

    fireEvent.click(screen.getByRole('button', { name: /Exportieren/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Als PPTX exportieren/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/PPTX-Export fehlgeschlagen/i);
    });
  });
});
