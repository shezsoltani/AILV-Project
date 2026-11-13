import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArchivePage } from '../../pages/questions/ArchivePage';
import { listCourses } from '../../services/coursesApi';
import { getArchiveTopics, getArchiveQuestions } from '../../services/questionsApi';
import type { Course } from '../../types/courses';
import type { ArchiveTopic } from '../../types/api';
import type { GeneratedQuestion } from '../../types/generatedQuestion';

vi.mock('../../services/coursesApi', () => ({
  listCourses: vi.fn(),
}));

vi.mock('../../services/questionsApi', () => ({
  getArchiveTopics: vi.fn(),
  getArchiveQuestions: vi.fn(),
  updateArchiveQuestions: vi.fn(),
  deleteArchiveEntry: vi.fn(),
}));

const mockListCourses = vi.mocked(listCourses);
const mockGetArchiveTopics = vi.mocked(getArchiveTopics);
const mockGetArchiveQuestions = vi.mocked(getArchiveQuestions);

const MATH_COURSE: Course = {
  id: 'c-math',
  name: 'Mathematik 1',
  created_at: '2026-11-01T10:00:00Z',
  question_count: 5,
};

const SWE_COURSE: Course = {
  id: 'c-swe',
  name: 'Software Engineering',
  created_at: '2026-11-01T10:00:00Z',
  question_count: 3,
};

const TOPIC_ALGEBRA_ALL: ArchiveTopic = {
  request_id: 'req-algebra',
  topic: 'Lineare Algebra',
  language: 'de',
  question_count: 4,
  types: ['MCQ'],
  created_at: '2026-11-01T10:00:00Z',
  finalized_at: '2026-11-01T10:05:00Z',
};

const TOPIC_ALGEBRA_MATH: ArchiveTopic = {
  ...TOPIC_ALGEBRA_ALL,
  question_count: 2,
};

const TOPIC_ALGEBRA_SWE: ArchiveTopic = {
  ...TOPIC_ALGEBRA_ALL,
  question_count: 2,
};

const TOPIC_GENERAL: ArchiveTopic = {
  request_id: 'req-general',
  topic: 'Allgemeinwissen',
  language: 'de',
  question_count: 3,
  types: ['MCQ'],
  created_at: '2026-11-02T10:00:00Z',
  finalized_at: '2026-11-02T10:05:00Z',
};

const QUESTIONS_ALGEBRA_MATH: GeneratedQuestion[] = [
  {
    id: 'q-1',
    question: 'Was ist der Rang einer Matrix?',
    type: 'MCQ',
    difficulty: 'medium',
    choices: ['A', 'B'],
    correct_index: 0,
    course_ids: ['c-math', 'c-swe'],
  },
  {
    id: 'q-2',
    question: 'Was ist ein Eigenwert?',
    type: 'MCQ',
    difficulty: 'easy',
    choices: ['A', 'B'],
    correct_index: 0,
    course_ids: ['c-math'],
  },
];

const setupDefaultMocks = () => {
  mockListCourses.mockResolvedValue([MATH_COURSE, SWE_COURSE]);
  mockGetArchiveTopics.mockImplementation(async (_search, filter) => {
    if (filter?.unassigned) {
      return { topics: [TOPIC_GENERAL] };
    }
    if (filter?.courseIds?.includes('c-math') && filter?.courseIds?.length === 1) {
      return { topics: [TOPIC_ALGEBRA_MATH] };
    }
    if (filter?.courseIds?.includes('c-swe') && filter?.courseIds?.length === 1) {
      return { topics: [TOPIC_ALGEBRA_SWE] };
    }
    if (filter?.courseIds && filter.courseIds.length > 1) {
      return { topics: [TOPIC_ALGEBRA_ALL] };
    }
    return { topics: [TOPIC_ALGEBRA_ALL, TOPIC_GENERAL] };
  });
};

describe('SCRUM-11: Fragenarchiv nach Lehrveranstaltungen filtern und gruppieren', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it('1. Filter-Auswahl: zeigt Alle, Ohne LV / Allgemein und eigene Lehrveranstaltungen an', async () => {
    render(<ArchivePage />);

    expect(await screen.findByRole('button', { name: 'Alle' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ohne LV / Allgemein' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mathematik 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Software Engineering' })).toBeInTheDocument();

    // Standardmäßig ist "Alle" aktiv
    expect(screen.getByRole('button', { name: 'Alle' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Mathematik 1' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('2. Filterwechsel auf Ohne LV / Allgemein ruft Backend mit unassigned=true auf', async () => {
    render(<ArchivePage />);
    await screen.findByRole('button', { name: 'Alle' });

    const btnUnassigned = screen.getByRole('button', { name: 'Ohne LV / Allgemein' });
    fireEvent.click(btnUnassigned);

    await waitFor(() => {
      expect(mockGetArchiveTopics).toHaveBeenCalledWith(undefined, { unassigned: true });
    });

    expect(screen.getByRole('heading', { name: 'Allgemein' })).toBeInTheDocument();
    expect(screen.getByText('Allgemeinwissen')).toBeInTheDocument();
  });

  it('3. Filterwechsel auf eine Lehrveranstaltung ruft Backend mit course_id auf', async () => {
    render(<ArchivePage />);
    await screen.findByRole('button', { name: 'Mathematik 1' });

    const btnMath = screen.getByRole('button', { name: 'Mathematik 1' });
    fireEvent.click(btnMath);

    await waitFor(() => {
      expect(mockGetArchiveTopics).toHaveBeenCalledWith(undefined, { courseIds: ['c-math'] });
    });

    expect(screen.getByRole('heading', { name: 'Mathematik 1' })).toBeInTheDocument();
    expect(screen.getByText('Lineare Algebra')).toBeInTheDocument();
    // Unter Mathe werden nur 2 Fragen gezählt (gemischte Daten)
    expect(screen.getByText('2 Fragen')).toBeInTheDocument();
  });

  it('4. Mehrfachauswahl mit ODER-Logik: zeigt mehrere Gruppen mit passenden Themen an', async () => {
    render(<ArchivePage />);
    await screen.findByRole('button', { name: 'Mathematik 1' });

    // Beide LVs auswählen
    fireEvent.click(screen.getByRole('button', { name: 'Mathematik 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Software Engineering' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Mathematik 1' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Software Engineering' })).toBeInTheDocument();
    });

    // Thema "Lineare Algebra" taucht in beiden Gruppen auf
    await waitFor(() => {
      const headings = screen.getAllByRole('heading', { name: 'Lineare Algebra' });
      expect(headings).toHaveLength(2);
    });

    // Klick auf "Alle" setzt den Filter zurück: Thema taucht nur EINMAL auf
    fireEvent.click(screen.getByRole('button', { name: 'Alle' }));
    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: 'Lineare Algebra' })).toHaveLength(1);
    });
  });

  it('5. Leere Gruppen: zeigt verständliche Meldung "Keine Fragen für diese LV gefunden"', async () => {
    mockGetArchiveTopics.mockImplementation(async (_search, filter) => {
      if (filter?.courseIds?.includes('c-math')) {
        return { topics: [] };
      }
      return { topics: [TOPIC_ALGEBRA_ALL] };
    });

    render(<ArchivePage />);
    await screen.findByRole('button', { name: 'Mathematik 1' });

    fireEvent.click(screen.getByRole('button', { name: 'Mathematik 1' }));

    expect(await screen.findByText('Keine Fragen für diese LV gefunden')).toBeInTheDocument();
  });

  it('6. Detailansicht & Filtererhalt: Filter bleibt beim Öffnen erhalten und filtert Fragen', async () => {
    mockGetArchiveQuestions.mockResolvedValue({
      request_id: 'req-algebra',
      topic: 'Lineare Algebra',
      language: 'de',
      questions: QUESTIONS_ALGEBRA_MATH,
    });

    render(<ArchivePage />);
    await screen.findByRole('button', { name: 'Mathematik 1' });

    // Filter setzen
    fireEvent.click(screen.getByRole('button', { name: 'Mathematik 1' }));
    await screen.findByRole('heading', { name: 'Mathematik 1' });

    // Thema öffnen
    const topicCard = await screen.findByRole('button', { name: /Thema Lineare Algebra öffnen/i });
    fireEvent.click(topicCard);

    // Backend-Aufruf für Fragen mit Filter
    await waitFor(() => {
      expect(mockGetArchiveQuestions).toHaveBeenCalledWith('req-algebra', { courseIds: ['c-math'] });
    });

    // Detailansicht zeigt Filter-Badge
    expect(screen.getByTestId('archive-active-filter')).toHaveTextContent('Filter aktiv: Mathematik 1');
    expect(screen.getByText('Was ist der Rang einer Matrix?')).toBeInTheDocument();

    // Zurück zur Liste: Filter ist immer noch aktiv
    fireEvent.click(screen.getByRole('button', { name: /Zurück zur Liste/i }));
    expect(await screen.findByRole('heading', { name: 'Mathematik 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mathematik 1' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('7. Kombination mit Textsuche: Suchbegriff und LV-Filter werden zusammen verwendet', async () => {
    mockGetArchiveQuestions.mockResolvedValue({
      request_id: 'req-algebra',
      topic: 'Lineare Algebra',
      language: 'de',
      questions: [
        {
          id: 'q1',
          question: 'Was ist eine Matrix?',
          type: 'SCQ',
          difficulty: 'easy',
          choices: ['Zahlenschema', 'Vektor'],
          correct_index: 0,
          course_ids: ['c-math'],
        },
        {
          id: 'q2',
          question: 'Was ist die Determinante?',
          type: 'SCQ',
          difficulty: 'medium',
          choices: ['Skalar', 'Vektor'],
          correct_index: 0,
          course_ids: ['c-math'],
        },
      ],
    });

    render(<ArchivePage />);
    await screen.findByRole('button', { name: 'Mathematik 1' });

    fireEvent.click(screen.getByRole('button', { name: 'Mathematik 1' }));

    const searchInput = screen.getByPlaceholderText(/Nach Thema oder Frageinhalt suchen/i);
    fireEvent.change(searchInput, { target: { value: 'Determinante' } });

    await waitFor(() => {
      expect(mockGetArchiveTopics).toHaveBeenCalledWith('Determinante', { courseIds: ['c-math'] });
    });

    // Thema öffnen
    const topicCard = await screen.findByRole('button', { name: /Thema Lineare Algebra öffnen/i });
    fireEvent.click(topicCard);

    // Detailansicht zeigt Filter-Badge mit Suche und nur die passende Frage
    expect(await screen.findByTestId('archive-active-filter')).toHaveTextContent('Filter aktiv: Mathematik 1 (Suche: "Determinante")');
    expect(screen.getByText('Was ist die Determinante?')).toBeInTheDocument();
    expect(screen.queryByText('Was ist eine Matrix?')).not.toBeInTheDocument();
  });
});
