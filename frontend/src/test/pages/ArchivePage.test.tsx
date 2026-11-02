import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ArchivePage } from '../../pages/questions/ArchivePage';
import type { GeneratedQuestion } from '../../types/generatedQuestion';
import type { ArchiveTopic } from '../../types/api';
import * as exportApi from '../../services/exportApi';

const mockTopic: ArchiveTopic = {
  request_id: 'req-1',
  topic: 'Datenbanken',
  language: 'de',
  question_count: 1,
  types: ['SHORT_ANSWER'],
  created_at: '2026-01-10T10:00:00Z',
  finalized_at: '2026-01-10T11:00:00Z',
};

const mockQuestion: GeneratedQuestion = {
  id: 'q1',
  question: 'Was ist ein Primärschlüssel?',
  type: 'SHORT_ANSWER',
  difficulty: 'easy',
  answer: 'Eindeutiger Identifikator',
};

const workflowState = vi.hoisted(() => ({
  topics: [] as ArchiveTopic[],
  isLoadingTopics: false,
  topicsError: null as string | null,
  searchTerm: '',
  setSearchTerm: vi.fn(),
  selectedRequestId: null as string | null,
  selectedTopic: null as string | null,
  archivedQuestions: [] as GeneratedQuestion[],
  isLoadingQuestions: false,
  questionsError: null as string | null,
  isEditMode: false,
  editableQuestions: [] as GeneratedQuestion[],
  isSaving: false,
  saveError: null as string | null,
  saveSuccess: false,
  isDeleting: false,
  deleteError: null as string | null,
  deleteSuccess: false,
  handleBackToList: vi.fn(),
  handleTopicSelect: vi.fn(),
  handleStartEdit: vi.fn(),
  handleArchivedQuestionChange: vi.fn(),
  handleCancelEdit: vi.fn(),
  handleSaveArchivedQuestions: vi.fn(),
  handleDeleteArchiveEntry: vi.fn(),
}));

vi.mock('../../hooks/questions/useArchiveWorkflow', () => ({
  useArchiveWorkflow: () => workflowState,
}));

vi.mock('../../services/exportApi', () => ({
  exportArchiveAsPdf: vi.fn(),
  exportArchiveAsPdfExam: vi.fn(),
  exportArchiveAsMoodle: vi.fn(),
  exportJobAsPdf: vi.fn(),
  exportJobAsPdfExam: vi.fn(),
  exportJobAsMoodle: vi.fn(),
  exportJobAsPptx: vi.fn(),
  exportArchiveAsPptx: vi.fn(),
}));

function resetWorkflowState() {
  workflowState.topics = [];
  workflowState.isLoadingTopics = false;
  workflowState.topicsError = null;
  workflowState.searchTerm = '';
  workflowState.selectedRequestId = null;
  workflowState.selectedTopic = null;
  workflowState.archivedQuestions = [];
  workflowState.isLoadingQuestions = false;
  workflowState.questionsError = null;
  workflowState.isEditMode = false;
  workflowState.editableQuestions = [];
  workflowState.isSaving = false;
  workflowState.saveError = null;
  workflowState.saveSuccess = false;
  workflowState.isDeleting = false;
  workflowState.deleteError = null;
  workflowState.deleteSuccess = false;
  vi.clearAllMocks();
}

describe('ArchivePage UI States', () => {
  beforeEach(() => {
    resetWorkflowState();
  });

  it('sollte eine Fehlermeldung anzeigen, wenn topicsError gesetzt ist', () => {
    workflowState.topicsError = 'Fehler beim Laden der Themen';
    render(<ArchivePage />);
    expect(screen.getByText(/Fehler beim Laden der Themen/i)).toBeInTheDocument();
  });

  it('sollte archivierte Themen in der Liste darstellen', () => {
    workflowState.topics = [mockTopic];
    render(<ArchivePage />);

    expect(screen.getByText('Datenbanken')).toBeInTheDocument();
    expect(screen.getByText(/1 Frage/i)).toBeInTheDocument();
  });

  it('sollte Loading-Zustand für Themen anzeigen', () => {
    workflowState.isLoadingTopics = true;
    render(<ArchivePage />);
    expect(screen.getByText(/Themen werden geladen/i)).toBeInTheDocument();
  });

  it('sollte Empty-State anzeigen, wenn keine Themen vorhanden sind', () => {
    render(<ArchivePage />);
    expect(screen.getByText(/Noch keine archivierten Themen vorhanden/i)).toBeInTheDocument();
  });

  it('sollte archivierte Fragen in der Detailansicht anzeigen', () => {
    workflowState.selectedRequestId = 'req-1';
    workflowState.selectedTopic = 'Datenbanken';
    workflowState.archivedQuestions = [mockQuestion];
    render(<ArchivePage />);

    expect(screen.getByText(/Archiv: Datenbanken/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Was ist ein Primärschlüssel?')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Eindeutiger Identifikator')).toBeInTheDocument();
  });

  it('sollte Fehler beim Laden der Fragen sichtbar darstellen', () => {
    workflowState.selectedRequestId = 'req-1';
    workflowState.questionsError = 'Fragen konnten nicht geladen werden.';
    render(<ArchivePage />);

    expect(screen.getByRole('alert')).toHaveTextContent(/Fragen konnten nicht geladen werden/i);
  });

  it('sollte Bearbeiten starten und Speichern auslösen', () => {
    workflowState.selectedRequestId = 'req-1';
    workflowState.selectedTopic = 'Datenbanken';
    workflowState.archivedQuestions = [mockQuestion];
    render(<ArchivePage />);

    fireEvent.click(screen.getByRole('button', { name: /Bearbeiten/i }));
    expect(workflowState.handleStartEdit).toHaveBeenCalled();
  });

  it('sollte Speichern-Button im Edit-Modus anzeigen und Speichern auslösen', () => {
    workflowState.selectedRequestId = 'req-1';
    workflowState.selectedTopic = 'Datenbanken';
    workflowState.archivedQuestions = [mockQuestion];
    workflowState.isEditMode = true;
    workflowState.editableQuestions = [{ ...mockQuestion, answer: 'UUID' }];
    render(<ArchivePage />);

    fireEvent.click(screen.getByRole('button', { name: /Speichern/i }));
    expect(workflowState.handleSaveArchivedQuestions).toHaveBeenCalled();
  });

  it('sollte Erfolgsmeldung nach dem Speichern anzeigen', () => {
    workflowState.selectedRequestId = 'req-1';
    workflowState.selectedTopic = 'Datenbanken';
    workflowState.archivedQuestions = [mockQuestion];
    workflowState.saveSuccess = true;
    render(<ArchivePage />);

    expect(screen.getByRole('status')).toHaveTextContent(/erfolgreich aktualisiert/i);
  });

  it('sollte Validierungs- bzw. Speicherfehler sichtbar darstellen', () => {
    workflowState.selectedRequestId = 'req-1';
    workflowState.selectedTopic = 'Datenbanken';
    workflowState.archivedQuestions = [mockQuestion];
    workflowState.isEditMode = true;
    workflowState.editableQuestions = [mockQuestion];
    workflowState.saveError = 'Bitte prüfen Sie Ihre Eingaben und versuchen Sie es erneut.';
    render(<ArchivePage />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      /Bitte prüfen Sie Ihre Eingaben und versuchen Sie es erneut/i,
    );
  });

  it('sollte Änderungen an einer Frage im Edit-Modus weitergeben', () => {
    workflowState.selectedRequestId = 'req-1';
    workflowState.selectedTopic = 'Datenbanken';
    workflowState.archivedQuestions = [mockQuestion];
    workflowState.isEditMode = true;
    workflowState.editableQuestions = [mockQuestion];
    render(<ArchivePage />);

    const answerInput = screen.getByDisplayValue('Eindeutiger Identifikator');
    fireEvent.change(answerInput, { target: { value: 'Neue Antwort' } });

    expect(workflowState.handleArchivedQuestionChange).toHaveBeenCalled();
  });

  it('sollte Archiv-PDF-Export aus der Detailansicht starten', async () => {
    (exportApi.exportArchiveAsPdf as any).mockResolvedValue(undefined);
    workflowState.selectedRequestId = 'req-1';
    workflowState.selectedTopic = 'Datenbanken';
    workflowState.archivedQuestions = [mockQuestion];
    render(<ArchivePage />);

    fireEvent.click(screen.getByRole('button', { name: /Exportieren/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Als PDF exportieren/i }));

    await waitFor(() => {
      expect(exportApi.exportArchiveAsPdf).toHaveBeenCalledWith('req-1');
    });
    expect(exportApi.exportJobAsPdf).not.toHaveBeenCalled();
  });

  it('sollte Archiv-Moodle-Export aus der Detailansicht starten', async () => {
    (exportApi.exportArchiveAsMoodle as any).mockResolvedValue(undefined);
    workflowState.selectedRequestId = 'req-1';
    workflowState.selectedTopic = 'Datenbanken';
    workflowState.archivedQuestions = [mockQuestion];
    render(<ArchivePage />);

    fireEvent.click(screen.getByRole('button', { name: /Exportieren/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Als Moodle XML exportieren/i }));

    await waitFor(() => {
      expect(exportApi.exportArchiveAsMoodle).toHaveBeenCalledWith('req-1');
    });
    expect(exportApi.exportJobAsMoodle).not.toHaveBeenCalled();
  });
});
