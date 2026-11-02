import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../../components/routing';
import { SlidesGeneratePage } from '../../pages/slides/SlidesGeneratePage';
import { JobContextProvider } from '../../context/JobContext';
import type { SlidesGenerateResponse } from '../../types/slides';

const mockUseAuth = vi.fn();
const mockGenerateSlides = vi.hoisted(() => vi.fn());

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../services/slidesApi', () => ({
  generateSlides: mockGenerateSlides,
  finalizeSlides: vi.fn(),
}));

vi.mock('../../services/jobsApi', () => ({
  getJobStatus: vi.fn(),
  cancelJob: vi.fn(),
}));

const mockFirstResponse: SlidesGenerateResponse = {
  status: 'completed',
  request_id: 'request-1',
  slides: [
    {
      position: 1,
      slide_type: 'title',
      title: 'Erste Vorschau',
      bullets: ['Erster Punkt'],
      examples: [],
    },
  ],
};

const mockSecondResponse: SlidesGenerateResponse = {
  status: 'completed',
  request_id: 'request-2',
  slides: [
    {
      position: 1,
      slide_type: 'title',
      title: 'Neue Vorschau',
      bullets: ['Neuer Punkt'],
      examples: [],
    },
  ],
};

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
  let setActiveJob: ((job: MockJob | null) => void) | null = null;
  let currentJob: MockJob | null = null;

  return {
    register(setter: (job: MockJob | null) => void) {
      setActiveJob = setter;
    },
    getJob() {
      return currentJob;
    },
    updateJob(patch: Partial<MockJob>) {
      if (!currentJob) {
        return;
      }
      currentJob = { ...currentJob, ...patch };
      setActiveJob?.(currentJob);
    },
    reset() {
      currentJob = null;
      setActiveJob?.(null);
    },
    createPending(jobId: string, jobType: string): MockJob {
      currentJob = {
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
      };
      return currentJob;
    },
    clearCurrent() {
      currentJob = null;
    },
  };
});

vi.mock('../../context/JobContext', () => {
  const ReactLib = require('react');
  const MockJobContext = ReactLib.createContext(null);

  function MockJobContextProvider({ children }: { children: React.ReactNode }) {
    const [activeJob, setActiveJob] = ReactLib.useState(null);

    // Sofort registrieren, damit Tests den Job-State synchron fortschreiben koennen.
    jobControls.register((job: MockJob | null) => {
      setActiveJob(job);
    });

    const addJob = (jobId: string, jobType: string) => {
      const pending = jobControls.createPending(jobId, jobType);
      setActiveJob(pending);
    };

    const dismissJob = () => {
      jobControls.clearCurrent();
      setActiveJob(null);
    };

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

function renderSlidesGeneratePage(): void {
  render(
    <MemoryRouter initialEntries={['/slides/generate']}>
      <Routes>
        <Route
          path="/slides/generate"
          element={
            <ProtectedRoute>
              <JobContextProvider>
                <SlidesGeneratePage />
              </JobContextProvider>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login Seite</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function fillRequiredFields(): void {
  fireEvent.change(screen.getByLabelText(/Thema/), {
    target: { value: 'Neuronale Netze' },
  });
  fireEvent.change(screen.getByLabelText(/Anzahl Folien/), {
    target: { value: '5' },
  });
}

function loginAsUser(): void {
  mockUseAuth.mockReturnValue({
    token: 'jwt-token',
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  });
}

async function startGeneration(jobId = 'job-1'): Promise<void> {
  mockGenerateSlides.mockResolvedValueOnce({ job_id: jobId, status: 'pending' });
  fillRequiredFields();
  fireEvent.click(screen.getByRole('button', { name: 'Folien generieren' }));
  // Warten bis der Job im Context registriert und der Skeleton sichtbar ist
  expect(await screen.findByText(/Generierung läuft/)).toBeInTheDocument();
}

async function completeJob(resultData: SlidesGenerateResponse): Promise<void> {
  await act(async () => {
    jobControls.updateJob({
      status: 'completed',
      progress: 100,
      stageLabel: 'Generierung abgeschlossen',
      resultData,
      errorMessage: null,
    });
  });
}

describe('SlidesGeneratePage – Routing', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockGenerateSlides.mockReset();
    jobControls.reset();
  });

  it('leitet nicht eingeloggte Nutzer von /slides/generate auf /login um', () => {
    mockUseAuth.mockReturnValue({
      token: null,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderSlidesGeneratePage();

    expect(screen.getByText('Login Seite')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Folien generieren' })).not.toBeInTheDocument();
  });

  it('zeigt die Seite mit Formular fuer eingeloggte Nutzer', () => {
    loginAsUser();
    renderSlidesGeneratePage();

    expect(screen.getByRole('heading', { name: 'Folien generieren' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Thema/)).toBeInTheDocument();
  });
});

describe('SlidesGeneratePage – Generierung und Jobs', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockGenerateSlides.mockReset();
    jobControls.reset();
    loginAsUser();
  });

  it('startet die Foliengenerierung und zeigt den Ladezustand', async () => {
    renderSlidesGeneratePage();
    await startGeneration('job-1');

    expect(await screen.findByText(/Generierung läuft/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generierung abbrechen' })).toBeInTheDocument();
  });

  it('zeigt Fortschritt und Stage-Label waehrend der Job laeuft', async () => {
    renderSlidesGeneratePage();
    await startGeneration('job-progress');

    await act(async () => {
      jobControls.updateJob({
        status: 'running',
        progress: 66,
        stageLabel: 'Folien werden aufgebaut',
      });
    });

    expect(await screen.findByText(/Folien werden aufgebaut/)).toBeInTheDocument();
    expect(screen.getByText('66%')).toBeInTheDocument();
  });

  it('zeigt nach erfolgreichem Jobabschluss die generierten Folien', async () => {
    renderSlidesGeneratePage();
    await startGeneration('job-1');
    await completeJob(mockFirstResponse);

    expect(await screen.findByRole('heading', { name: 'Erste Vorschau' })).toBeInTheDocument();
    expect(screen.queryByText(/Generierung läuft/)).not.toBeInTheDocument();
  });

  it('zeigt eine sichtbare Fehlermeldung bei fehlgeschlagenem Job', async () => {
    renderSlidesGeneratePage();
    await startGeneration('job-failed');

    await act(async () => {
      jobControls.updateJob({
        status: 'failed',
        progress: 15,
        errorMessage: 'Folien-Generierung fehlgeschlagen',
        resultData: null,
      });
    });

    // Fehler erscheint sowohl im Formular als auch im Modal (gleiche submitError-Quelle).
    const alerts = await screen.findAllByRole('alert');
    expect(alerts.length).toBeGreaterThanOrEqual(1);
    expect(alerts[0]).toHaveTextContent(/Folien-Generierung fehlgeschlagen/);
    expect(screen.queryByText(/Generierung läuft/)).not.toBeInTheDocument();
  });

  it('generiert mit denselben Eingaben neu und zeigt waehrenddessen den Ladezustand', async () => {
    let resolveSecondResponse: (response: { job_id: string; status: string }) => void = () => {};
    const pendingSecondResponse = new Promise<{ job_id: string; status: string }>((resolve) => {
      resolveSecondResponse = resolve;
    });

    mockGenerateSlides
      .mockResolvedValueOnce({ job_id: 'job-1', status: 'pending' })
      .mockReturnValueOnce(pendingSecondResponse);

    renderSlidesGeneratePage();
    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: 'Folien generieren' }));
    expect(await screen.findByText(/Generierung läuft/)).toBeInTheDocument();
    await completeJob(mockFirstResponse);
    expect(await screen.findByRole('heading', { name: 'Erste Vorschau' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Neu generieren' }));
    expect(await screen.findByText(/Generierung läuft/)).toBeInTheDocument();
    expect(mockGenerateSlides).toHaveBeenLastCalledWith({
      topic: 'Neuronale Netze',
      slideCount: 5,
      language: 'de',
    });

    await act(async () => {
      resolveSecondResponse({ job_id: 'job-2', status: 'pending' });
    });
    expect(await screen.findByText(/Generierung läuft/)).toBeInTheDocument();
    await completeJob(mockSecondResponse);

    expect(await screen.findByRole('heading', { name: 'Neue Vorschau' })).toBeInTheDocument();
  });

  it('zeigt nach Schliessen des Modals das Formular mit den alten Werten', async () => {
    renderSlidesGeneratePage();
    await startGeneration('job-1');
    await completeJob(mockFirstResponse);
    expect(await screen.findByRole('heading', { name: 'Erste Vorschau' })).toBeInTheDocument();

    const closeBtn = document.querySelector('.questions-modal-close');
    expect(closeBtn).not.toBeNull();
    fireEvent.click(closeBtn!);

    expect(screen.getByLabelText(/Thema/)).toHaveValue('Neuronale Netze');
    expect(screen.getByLabelText(/Anzahl Folien/)).toHaveValue('5');
    expect(screen.queryByRole('heading', { name: 'Erste Vorschau' })).not.toBeInTheDocument();
  });
});
