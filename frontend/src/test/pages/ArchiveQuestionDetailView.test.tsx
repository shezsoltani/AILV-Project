import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ArchiveQuestionDetailView } from '../../pages/questions/ArchiveQuestionDetailView';
import type { Course } from '../../types/courses';
import type { GeneratedQuestion } from '../../types/generatedQuestion';

const COURSES: Course[] = [
  { id: 'course-a', name: 'Mathematik 1', created_at: '2026-11-01T10:00:00Z', question_count: 1 },
  { id: 'course-b', name: 'Software Engineering', created_at: '2026-11-01T10:00:00Z', question_count: 1 },
];

const QUESTION: GeneratedQuestion = {
  id: 'question-1',
  question: 'Was ist eine Matrix?',
  type: 'SCQ',
  difficulty: 'easy',
  choices: ['Eine Tabelle', 'Ein Text'],
  correct_index: 0,
  course_ids: ['course-a'],
};

const renderDetail = (onSaveQuestionCourses = vi.fn().mockResolvedValue(undefined)) => render(
  <ArchiveQuestionDetailView
    selectedRequestId="request-1"
    selectedTopic="Lineare Algebra"
    archivedQuestions={[QUESTION]}
    isLoadingQuestions={false}
    questionsError={null}
    saveError={null}
    deleteError={null}
    assignmentNotice={null}
    courses={COURSES}
    onSaveQuestionCourses={onSaveQuestionCourses}
    saveSuccess={false}
    isEditMode={false}
    editableQuestions={[]}
    isSaving={false}
    isDeleting={false}
    onBackToList={vi.fn()}
    onStartEdit={vi.fn()}
    onArchivedQuestionChange={vi.fn()}
    onCancelEdit={vi.fn()}
    onSaveArchivedQuestions={vi.fn()}
    onRequestDelete={vi.fn()}
  />
);

describe('Archivfrage: LV-Zuordnung ändern', () => {
  beforeEach(() => vi.clearAllMocks());

  it('zeigt vorhandene Zuordnungen als LV-Namen an', () => {
    renderDetail();
    expect(screen.getByText('Mathematik 1')).toBeInTheDocument();
    expect(screen.getByText('Zugeordnet:')).toBeInTheDocument();
  });

  it('fügt eine weitere LV hinzu und speichert die vollständige ID-Liste', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    renderDetail(save);

    fireEvent.click(screen.getByRole('button', { name: 'LV-Zuordnung ändern' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Software Engineering' }));
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    await waitFor(() => expect(save).toHaveBeenCalledWith('question-1', ['course-a', 'course-b']));
    expect(screen.queryByRole('checkbox', { name: 'Software Engineering' })).not.toBeInTheDocument();
  });

  it('entfernt alle Zuordnungen mit einer leeren Liste', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    renderDetail(save);

    fireEvent.click(screen.getByRole('button', { name: 'LV-Zuordnung ändern' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mathematik 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    await waitFor(() => expect(save).toHaveBeenCalledWith('question-1', []));
  });

  it('verwirft Änderungen beim Abbrechen', () => {
    const save = vi.fn();
    renderDetail(save);

    fireEvent.click(screen.getByRole('button', { name: 'LV-Zuordnung ändern' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Software Engineering' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));

    expect(save).not.toHaveBeenCalled();
    expect(screen.getByText('Zugeordnet:').parentElement).toHaveTextContent('Mathematik 1');
    expect(screen.getByText('Zugeordnet:').parentElement).not.toHaveTextContent('Software Engineering');
  });

  it('zeigt bei fehlgeschlagenem Speichern einen Fehler und behält die bisherige Zuordnung', async () => {
    const save = vi.fn().mockRejectedValue(new Error('Course not found'));
    renderDetail(save);

    fireEvent.click(screen.getByRole('button', { name: 'LV-Zuordnung ändern' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Software Engineering' }));
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Eine ausgewählte LV wurde gelöscht oder gehört nicht zu Ihrem Konto');
    expect(screen.getByText('Zugeordnet:').parentElement).toHaveTextContent('Mathematik 1');
    expect(screen.getByRole('checkbox', { name: 'Software Engineering' })).toBeInTheDocument();
  });
});
