// Exportformat-Buttons (PDF, Moodle XML, PPTX) – Dropdown + Einzelbutton
import React, { useState, useRef, useEffect } from 'react';
import { ErrorBanner } from './ErrorBanner';
import { exportJobAsPdf, exportArchiveAsPdf, exportJobAsMoodle, exportArchiveAsMoodle, exportJobAsPptx, exportArchiveAsPptx } from '../../services/exportApi';
import { getUserFriendlyMessage } from '../../error-handling/errorMappers';

interface ExportDropdownButtonProps {
  jobId: string;
  // "job" für frisch generierte Jobs, "archive" für archivierte Einträge
  mode?: 'job' | 'archive';
  disabled?: boolean;
}

export const ExportDropdownButton: React.FC<ExportDropdownButtonProps> = ({
  jobId,
  mode = 'job',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [isMoodleExporting, setIsMoodleExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(function closeOnOutsideClick() {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleExportPdf(): Promise<void> {
    if (isPdfExporting) return;
    setIsPdfExporting(true);
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
      setIsPdfExporting(false);
      setIsOpen(false);
    }
  }

  async function handleExportMoodle(): Promise<void> {
    if (isMoodleExporting) return;
    setIsMoodleExporting(true);
    setExportError(null);
    try {
      if (mode === 'archive') {
        await exportArchiveAsMoodle(jobId);
      } else {
        await exportJobAsMoodle(jobId);
      }
    } catch (error) {
      setExportError(getUserFriendlyMessage(error));
    } finally {
      setIsMoodleExporting(false);
      setIsOpen(false);
    }
  }

  const isAnyExporting = isPdfExporting || isMoodleExporting;

  return (
    <>
      <div className="export-dropdown" ref={containerRef}>
        <button
          type="button"
          className="secondary-button export-dropdown__trigger"
          onClick={() => setIsOpen((prev) => !prev)}
          disabled={disabled || isAnyExporting}
          aria-expanded={isOpen}
          aria-haspopup="menu"
        >
          {isAnyExporting ? (
            <span className="form-submit-button__loading">
              <span className="export-dropdown__spinner" aria-hidden="true" />
              Wird exportiert ...
            </span>
          ) : (
            <>
              Exportieren
              <svg
                className={'export-dropdown__chevron' + (isOpen ? ' export-dropdown__chevron--open' : '')}
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </>
          )}
        </button>

        {isOpen && (
          <div className="export-dropdown__menu" role="menu">
            <button
              type="button"
              className="export-dropdown__item"
              role="menuitem"
              onClick={handleExportPdf}
              disabled={isPdfExporting}
              aria-busy={isPdfExporting}
            >
              {isPdfExporting ? (
                <span className="form-submit-button__loading">
                  <span className="export-dropdown__spinner" aria-hidden="true" />
                  PDF wird erstellt ...
                </span>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Als PDF exportieren
                </>
              )}
            </button>
            <button
              type="button"
              className="export-dropdown__item"
              role="menuitem"
              onClick={handleExportMoodle}
              disabled={isMoodleExporting}
              aria-busy={isMoodleExporting}
            >
              {isMoodleExporting ? (
                <span className="form-submit-button__loading">
                  <span className="export-dropdown__spinner" aria-hidden="true" />
                  XML wird erstellt ...
                </span>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                  Als Moodle XML exportieren
                </>
              )}
            </button>
          </div>
        )}
      </div>
      <ErrorBanner message={exportError} />
    </>
  );
};

interface MoodleExportButtonProps {
  jobId: string;
  // "job" für frisch generierte Jobs, "archive" für archivierte Einträge (nutzt andere Route)
  mode?: 'job' | 'archive';
  disabled?: boolean;
}

export const MoodleExportButton: React.FC<MoodleExportButtonProps> = ({
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
        await exportArchiveAsMoodle(jobId);
      } else {
        await exportJobAsMoodle(jobId);
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
            XML wird erstellt ...
          </span>
        ) : (
          'Als Moodle XML exportieren'
        )}
      </button>
      <ErrorBanner message={exportError} />
    </>
  );
};


interface SlidesExportDropdownButtonProps {
  jobId: string;
  // "job" für frisch generierte Jobs, "archive" für archivierte Decks
  mode?: 'job' | 'archive';
  disabled?: boolean;
}

export const SlidesExportDropdownButton: React.FC<SlidesExportDropdownButtonProps> = ({
  jobId,
  mode = 'job',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPptxExporting, setIsPptxExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(function closeOnOutsideClick() {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleExportPptx(): Promise<void> {
    if (isPptxExporting) return;
    setIsPptxExporting(true);
    setExportError(null);
    try {
      if (mode === 'archive') {
        await exportArchiveAsPptx(jobId);
      } else {
        await exportJobAsPptx(jobId);
      }
    } catch (error) {
      setExportError(getUserFriendlyMessage(error));
    } finally {
      setIsPptxExporting(false);
      setIsOpen(false);
    }
  }

  return (
    <>
      <div className="export-dropdown" ref={containerRef}>
        <button
          type="button"
          className="secondary-button export-dropdown__trigger"
          onClick={() => setIsOpen((prev) => !prev)}
          disabled={disabled || isPptxExporting}
          aria-expanded={isOpen}
          aria-haspopup="menu"
        >
          {isPptxExporting ? (
            <span className="form-submit-button__loading">
              <span className="export-dropdown__spinner" aria-hidden="true" />
              Wird exportiert ...
            </span>
          ) : (
            <>
              Exportieren
              <svg
                className={'export-dropdown__chevron' + (isOpen ? ' export-dropdown__chevron--open' : '')}
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </>
          )}
        </button>

        {isOpen && (
          <div className="export-dropdown__menu" role="menu">
            <button
              type="button"
              className="export-dropdown__item"
              role="menuitem"
              onClick={handleExportPptx}
              disabled={isPptxExporting}
              aria-busy={isPptxExporting}
            >
              {isPptxExporting ? (
                <span className="form-submit-button__loading">
                  <span className="export-dropdown__spinner" aria-hidden="true" />
                  PPTX wird erstellt ...
                </span>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><path d="M8 21h8m-4-4v4"/></svg>
                  Als PPTX exportieren
                </>
              )}
            </button>
          </div>
        )}
      </div>
      <ErrorBanner message={exportError} />
    </>
  );
};
