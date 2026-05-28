// src/context/JobContext.tsx
// Globaler Zustand für asynchrone KI-Jobs: Polling, Fortschritt und Statusanzeige.

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getJobStatus } from '../services/jobsApi';

type JobType = 'generate_questions' | 'generate_slides';
type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ActiveJob {
  jobId: string;
  jobType: JobType;
  status: JobStatus;
  progress: number;
  batchCurrent: number;
  batchTotal: number;
  batchRetrying: boolean;
  stageLabel: string | null;
  resultData: unknown | null;
  errorMessage: string | null;
}

interface JobContextValue {
  activeJob: ActiveJob | null;
  addJob: (jobId: string, jobType: JobType) => void;
  dismissJob: () => void;
}

const JobContext = createContext<JobContextValue | undefined>(undefined);
const POLLING_INTERVAL_MS = 2000; // Backend alle 2 Sekunden befragen
const COMPLETED_VISIBILITY_MS = 30000; // Abgeschlossene Jobs 30 Sek. in der Statusleiste sichtbar lassen

interface JobContextProviderProps {
  children: React.ReactNode;
}

export function JobContextProvider({ children }: JobContextProviderProps) {
  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null);

  // Registriert einen neuen Job — ersetzt sofort einen eventuell noch laufenden.
  function addJob(jobId: string, jobType: JobType): void {
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
    localStorage.setItem('activeJobId', JSON.stringify({ jobId, jobType }));
  }

  function dismissJob(): void {
    localStorage.removeItem('activeJobId');
    setActiveJob(null);
  }

  useEffect(function restoreJobFromStorage() {
    async function restore() {
      const stored = localStorage.getItem('activeJobId');
      if (!stored) return;

      const { jobId, jobType } = JSON.parse(stored);

      try {
        const statusResponse = await getJobStatus(jobId);
        setActiveJob({
          jobId,
          jobType,
          status: statusResponse.status as JobStatus,
          progress: statusResponse.progress,
          batchCurrent: statusResponse.batch_current,
          batchTotal: statusResponse.batch_total,
          batchRetrying: statusResponse.batch_retrying ?? false,
          stageLabel: statusResponse.stage_label,
          resultData: statusResponse.result_data,
          errorMessage: statusResponse.error_message,
        });
      } catch {
        localStorage.removeItem('activeJobId');
        return;
      }
    }
    restore();
  }, []);

  // Polling startet wenn eine neue jobId vorliegt; Dependency ist nur jobId, nicht das gesamte Objekt.
  useEffect(function startPollingOnNewJob() {
    if (!activeJob?.jobId) {
      return;
    }

    const intervalId = window.setInterval(async function () {
      try {
        const statusResponse = await getJobStatus(activeJob.jobId);
        const normalizedStatus = statusResponse.status as JobStatus;

        setActiveJob(function (previousJob) {
          if (!previousJob || previousJob.jobId !== activeJob.jobId) {
            return previousJob; // Anderen Job nicht überschreiben (Race Condition)
          }

          return {
            ...previousJob,
            status: normalizedStatus,
            progress: statusResponse.progress,
            batchCurrent: statusResponse.batch_current,
            batchTotal: statusResponse.batch_total,
            batchRetrying: statusResponse.batch_retrying ?? false,
            stageLabel: statusResponse.stage_label,
            resultData: statusResponse.result_data,
            errorMessage: statusResponse.error_message,
          };
        });

        if (normalizedStatus === 'completed' || normalizedStatus === 'failed') {
          window.clearInterval(intervalId); // Endstatus erreicht → nicht weiter pollen
        }
      } catch (error) {
        window.clearInterval(intervalId); // Netzwerkfehler → Polling abbrechen, Fehler anzeigen
        setActiveJob(function (previousJob) {
          if (!previousJob || previousJob.jobId !== activeJob.jobId) {
            return previousJob;
          }

          return {
            ...previousJob,
            status: 'failed',
            errorMessage:
              error instanceof Error
                ? error.message
                : 'Fehler beim Abrufen des Job-Status.',
          };
        });
      }
    }, POLLING_INTERVAL_MS);

    return function cleanupPolling() {
      window.clearInterval(intervalId); // Interval freigeben wenn jobId wechselt oder Komponente unmountet
    };
  }, [activeJob?.jobId]);

  // Abgeschlossene Jobs bleiben für COMPLETED_VISIBILITY_MS sichtbar, dann auto-dismiss.
  useEffect(
    function keepCompletedJobVisibleTemporarily() {
      if (!activeJob || activeJob.status !== 'completed') {
        return;
      }

      const timeoutId = window.setTimeout(function () {
        setActiveJob(function (previousJob) {
          if (!previousJob || previousJob.jobId !== activeJob.jobId) {
            return previousJob;
          }

          localStorage.removeItem('activeJobId');
          return null;
        });
      }, COMPLETED_VISIBILITY_MS);

      return function cleanupCompletedTimeout() {
        window.clearTimeout(timeoutId);
      };
    },
    [activeJob?.jobId, activeJob?.status]
  );

  const value = useMemo<JobContextValue>(
    function () {
      return { activeJob, addJob, dismissJob };
    },
    [activeJob]
  );

  return <JobContext.Provider value={value}>{children}</JobContext.Provider>;
}

export function useJobContext(): JobContextValue {
  const context = useContext(JobContext);

  if (!context) {
    throw new Error('useJobContext must be used within a JobContextProvider');
  }

  return context;
}
