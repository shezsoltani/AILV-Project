import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useArchiveWorkflow } from '../../hooks/questions/useArchiveWorkflow';
import * as questionsApi from '../../services/questionsApi';
import { ApiError } from '../../error-handling/AppErrors';

vi.mock('../../services/questionsApi', () => ({
  getArchiveTopics: vi.fn(),
  getArchiveQuestions: vi.fn(),
  updateArchiveQuestions: vi.fn(),
  deleteArchiveEntry: vi.fn(),
}));

const mockTopic = {
  request_id: 'req-1',
  topic: 'Datenbanken',
  language: 'de',
  question_count: 1,
  types: ['SHORT_ANSWER'],
  created_at: '2026-01-10T10:00:00Z',
  finalized_at: '2026-01-10T11:00:00Z',
};

const mockQuestion = {
  id: 'q1',
  question: 'Was ist ein Primärschlüssel?',
  type: 'SHORT_ANSWER' as const,
  difficulty: 'easy' as const,
  answer: 'Eindeutiger Identifikator',
};

describe('useArchiveWorkflow Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (questionsApi.getArchiveTopics as any).mockResolvedValue({ topics: [mockTopic] });
  });

  it('lädt archivierte Themen beim Mount', async () => {
    const { result } = renderHook(() => useArchiveWorkflow());

    await waitFor(() => {
      expect(result.current.isLoadingTopics).toBe(false);
    });

    expect(questionsApi.getArchiveTopics).toHaveBeenCalled();
    expect(result.current.topics).toEqual([mockTopic]);
    expect(result.current.topicsError).toBeNull();
  });

  it('setzt topicsError, wenn das Laden der Themen fehlschlägt', async () => {
    (questionsApi.getArchiveTopics as any).mockRejectedValue(new Error('Netzwerkfehler'));

    const { result } = renderHook(() => useArchiveWorkflow());

    await waitFor(() => {
      expect(result.current.isLoadingTopics).toBe(false);
    });

    expect(result.current.topicsError).toBe('Netzwerkfehler');
  });

  it('lädt Fragen nach Themenauswahl', async () => {
    (questionsApi.getArchiveQuestions as any).mockResolvedValue({
      request_id: 'req-1',
      topic: 'Datenbanken',
      language: 'de',
      questions: [mockQuestion],
    });

    const { result } = renderHook(() => useArchiveWorkflow());

    await waitFor(() => {
      expect(result.current.isLoadingTopics).toBe(false);
    });

    act(() => {
      result.current.handleTopicSelect('req-1');
    });

    await waitFor(() => {
      expect(result.current.isLoadingQuestions).toBe(false);
      expect(result.current.archivedQuestions).toEqual([mockQuestion]);
    });

    expect(result.current.selectedTopic).toBe('Datenbanken');
    expect(questionsApi.getArchiveQuestions).toHaveBeenCalledWith('req-1');
  });

  it('setzt questionsError, wenn das Laden der Fragen fehlschlägt', async () => {
    (questionsApi.getArchiveQuestions as any).mockRejectedValue(
      new Error('Fragen konnten nicht geladen werden.'),
    );

    const { result } = renderHook(() => useArchiveWorkflow());

    await waitFor(() => {
      expect(result.current.isLoadingTopics).toBe(false);
    });

    act(() => {
      result.current.handleTopicSelect('req-1');
    });

    await waitFor(() => {
      expect(result.current.isLoadingQuestions).toBe(false);
    });

    expect(result.current.questionsError).toBe('Fragen konnten nicht geladen werden.');
    expect(result.current.archivedQuestions).toEqual([]);
  });

  it('speichert bearbeitete Fragen und zeigt Erfolg', async () => {
    (questionsApi.getArchiveQuestions as any).mockResolvedValue({
      request_id: 'req-1',
      topic: 'Datenbanken',
      language: 'de',
      questions: [mockQuestion],
    });
    const updatedQuestion = { ...mockQuestion, answer: 'Neue Antwort' };
    (questionsApi.updateArchiveQuestions as any).mockResolvedValue({
      request_id: 'req-1',
      topic: 'Datenbanken',
      language: 'de',
      questions: [updatedQuestion],
    });

    const { result } = renderHook(() => useArchiveWorkflow());

    await waitFor(() => {
      expect(result.current.isLoadingTopics).toBe(false);
    });

    act(() => {
      result.current.handleTopicSelect('req-1');
    });

    await waitFor(() => {
      expect(result.current.archivedQuestions).toHaveLength(1);
    });

    act(() => {
      result.current.handleStartEdit();
    });

    act(() => {
      result.current.handleArchivedQuestionChange(updatedQuestion);
    });

    await act(async () => {
      await result.current.handleSaveArchivedQuestions();
    });

    expect(questionsApi.updateArchiveQuestions).toHaveBeenCalledWith('req-1', [updatedQuestion]);
    expect(result.current.isEditMode).toBe(false);
    expect(result.current.saveSuccess).toBe(true);
    expect(result.current.archivedQuestions).toEqual([updatedQuestion]);
  });

  it('setzt saveError bei Validierungsfehlern vom Backend', async () => {
    (questionsApi.getArchiveQuestions as any).mockResolvedValue({
      request_id: 'req-1',
      topic: 'Datenbanken',
      language: 'de',
      questions: [mockQuestion],
    });
    (questionsApi.updateArchiveQuestions as any).mockRejectedValue(
      new ApiError('Validation failed', 422, 'validation_error'),
    );

    const { result } = renderHook(() => useArchiveWorkflow());

    await waitFor(() => {
      expect(result.current.isLoadingTopics).toBe(false);
    });

    act(() => {
      result.current.handleTopicSelect('req-1');
    });

    await waitFor(() => {
      expect(result.current.archivedQuestions).toHaveLength(1);
    });

    act(() => {
      result.current.handleStartEdit();
    });

    await act(async () => {
      await result.current.handleSaveArchivedQuestions();
    });

    expect(result.current.saveError).toBe(
      'Bitte prüfen Sie Ihre Eingaben und versuchen Sie es erneut.',
    );
    expect(result.current.isEditMode).toBe(true);
    expect(result.current.saveSuccess).toBe(false);
  });

  it('setzt saveError, wenn das Speichern fehlschlägt', async () => {
    (questionsApi.getArchiveQuestions as any).mockResolvedValue({
      request_id: 'req-1',
      topic: 'Datenbanken',
      language: 'de',
      questions: [mockQuestion],
    });
    (questionsApi.updateArchiveQuestions as any).mockRejectedValue(
      new Error('Fragen konnten nicht gespeichert werden.'),
    );

    const { result } = renderHook(() => useArchiveWorkflow());

    await waitFor(() => {
      expect(result.current.isLoadingTopics).toBe(false);
    });

    act(() => {
      result.current.handleTopicSelect('req-1');
    });

    await waitFor(() => {
      expect(result.current.archivedQuestions).toHaveLength(1);
    });

    act(() => {
      result.current.handleStartEdit();
    });

    await act(async () => {
      await result.current.handleSaveArchivedQuestions();
    });

    expect(result.current.saveError).toBe('Fragen konnten nicht gespeichert werden.');
    expect(result.current.saveSuccess).toBe(false);
    expect(result.current.isEditMode).toBe(true);
  });
});
