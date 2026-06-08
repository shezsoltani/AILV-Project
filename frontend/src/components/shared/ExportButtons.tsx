// Exportformat-Buttons (PDF, später auch XML und PPTX) – je mit eigenem Lade- und Fehlerzustand
import React, { useState } from 'react';
import { ErrorBanner } from './ErrorBanner';
import { exportJobAsPdf, exportArchiveAsPdf } from '../../services/exportApi';
import { getUserFriendlyMessage } from '../../error-handling/errorMappers';

interface PdfExportButtonProps {
  jobId: string;
  // "job" für frisch generierte Jobs, "archive" für archivierte Einträge (nutzt andere Route)
  mode?: 'job' | 'archive';
  disabled?: boolean;
}

export const PdfExportButton: React.FC<PdfExportButtonProps> = ({
  jobId,
  mode = 'job',
  disabled = false,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function handleExport(): Promise<void> {
    if (isExporting) return;
    setIsExporting(true);
    setExportError(null);
    try {
      if (mode === 'archive') {
        await exportArchiveAsPdf(jobId);
      } else {
        await exportJobAsPdf(jobId);
      }
    } catch (error) {
      setExportError(getUserFriendlyMessage(error));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="secondary-button"
        onClick={handleExport}
        disabled={isExporting || disabled}
        aria-busy={isExporting}
      >
        {isExporting ? (
          <span className="form-submit-button__loading">
            <span className="form-button-spinner" aria-hidden="true" />
            PDF wird erstellt ...
          </span>
        ) : (
          'Als PDF exportieren'
        )}
      </button>
      <ErrorBanner message={exportError} />
    </>
  );
};
