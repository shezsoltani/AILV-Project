import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useJobContext } from '../../context/JobContext';
import { AlertTriangle, X } from 'lucide-react';

function resolveStageText(progress: number): string {
  if (progress >= 100) {
    return 'Schritt 3 von 3';
  }

  if (progress >= 66) {
    return 'Schritt 2 von 3';
  }

  return 'Schritt 1 von 3';
}

export const JobStatusBar: React.FC = () => {
  const { activeJob, dismissJob } = useJobContext();
  const navigate = useNavigate();
  const location = useLocation();

  if (!activeJob) {
    return null;
  }

  const progress = Math.min(100, Math.max(0, Math.round(activeJob.progress)));
  const isCompleted = activeJob.status === 'completed';
  const isRunning = activeJob.status === 'pending' || activeJob.status === 'running';
  const isFailed = activeJob.status === 'failed';
  const route = activeJob.jobType === 'generate_questions' ? '/generate' : '/slides/generate';
  const stageText = resolveStageText(progress);
  const stageLabel = isCompleted
    ? 'Generierung abgeschlossen'
    : activeJob.stageLabel ?? 'Verarbeitung läuft...';
  const { batchCurrent, batchTotal } = activeJob;
  const hasBatches = batchTotal > 1;
  const displayProgress = isCompleted
    ? 100
    : hasBatches
      ? Math.min(100, Math.round(((batchCurrent - 1) * 100 + progress) / batchTotal))
      : progress;

  function handleClick(): void {
    if (location.pathname === route) {
      window.dispatchEvent(new CustomEvent('open-active-job-modal'));
      dismissJob();
      return;
    }

    navigate(route);
    dismissJob();
  }


  if (isFailed) {
    return (
      <div className="job-status-bar job-status-bar--error" role="alert">
        <div className="job-status-bar__inner">
          <div className="job-status-bar__header">
            <AlertTriangle className="job-status-bar__error-icon" aria-hidden="true" />
            <p className="job-status-bar__text">
              {activeJob.errorMessage ?? 'Ein unbekannter Fehler ist aufgetreten.'}
            </p>
            <button
              type="button"
              className="job-status-bar__dismiss"
              onClick={dismissJob}
              aria-label="Fehler schließen"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="job-status-bar" role="status" aria-live="polite">
      <button type="button" className="job-status-bar__inner" onClick={handleClick}>
        {isRunning && hasBatches && (
          <p className="job-status-bar__batch-label">
            Batch {batchCurrent} von {batchTotal}
          </p>
        )}
        <div className="job-status-bar__header">
          {isRunning ? (
            <span className="job-status-bar__spinner" aria-hidden="true" />
          ) : (
            <span className="job-status-bar__done" aria-hidden="true">✓</span>
          )}
          <p className="job-status-bar__text">
            {isCompleted ? stageLabel : `${stageLabel} - ${stageText}`}
          </p>
          {isCompleted ? (
            <span className="job-status-bar__action">Ergebnis ansehen &rarr;</span>
          ) : (
            <span className="job-status-bar__percent">{displayProgress}%</span>
          )}
        </div>

        {!isCompleted && (
          <div className="job-status-bar__track" aria-hidden="true">
            <div className="job-status-bar__fill" style={{ width: `${displayProgress}%` }} />
          </div>
        )}
      </button>
    </div>
  );
};
