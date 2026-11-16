import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoursesPage } from '../../pages/courses/CoursesPage';
import { sortCoursesByName } from '../../hooks/courses/useCourses';
import { ApiError, NetworkError } from '../../error-handling/AppErrors';
import {
  listCourses,
  createCourse,
  renameCourse,
  deleteCourse,
} from '../../services/coursesApi';
import type { Course } from '../../types/courses';

vi.mock('../../services/coursesApi', () => ({
  listCourses: vi.fn(),
  createCourse: vi.fn(),
  renameCourse: vi.fn(),
  deleteCourse: vi.fn(),
}));

const mockList = vi.mocked(listCourses);
const mockCreate = vi.mocked(createCourse);
const mockRename = vi.mocked(renameCourse);
const mockDelete = vi.mocked(deleteCourse);

function course(id: string, name: string, questionCount = 0): Course {
  return { id, name, created_at: '2026-11-11T10:00:00Z', question_count: questionCount };
}

const DBS = course('c-dbs', 'Datenbanksysteme', 3);
const SWE = course('c-swe', 'Software Engineering', 1);
const ALGO = course('c-algo', 'Algorithmen', 0);

async function renderLoaded(courses: Course[] = [DBS, SWE]) {
  mockList.mockResolvedValue(courses);
  render(<CoursesPage />);
  await screen.findByLabelText('Name');
}

function itemNames(): string[] {
  return screen.queryAllByRole('listitem').map((item) => {
    const heading = within(item).queryByRole('heading');
    return heading?.textContent ?? '';
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CoursesPage – Laden', () => {
  it('zeigt zuerst den Ladezustand und dann die Liste mit Fragenanzahl', async () => {
    mockList.mockResolvedValue([SWE, DBS, ALGO]);
    render(<CoursesPage />);

    expect(screen.getByText('Lehrveranstaltungen werden geladen...')).toBeInTheDocument();

    expect(await screen.findByRole('heading', { name: 'Datenbanksysteme' })).toBeInTheDocument();
    expect(screen.queryByText('Lehrveranstaltungen werden geladen...')).not.toBeInTheDocument();

    // nach Namen sortiert
    expect(itemNames()).toEqual(['Algorithmen', 'Datenbanksysteme', 'Software Engineering']);
    expect(screen.getByText('3 Fragen')).toBeInTheDocument();
    expect(screen.getByText('1 Frage')).toBeInTheDocument();
    expect(screen.getByText('0 Fragen')).toBeInTheDocument();
  });

  it('zeigt einen Leerzustand, wenn es noch keine LV gibt', async () => {
    await renderLoaded([]);

    expect(screen.getByText('Noch keine Lehrveranstaltungen angelegt')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('zeigt einen Ladefehler und lädt auf Knopfdruck erneut', async () => {
    mockList.mockRejectedValueOnce(new NetworkError('Backend nicht erreichbar.'));
    mockList.mockResolvedValueOnce([DBS]);
    render(<CoursesPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Backend nicht erreichbar.');
    // Ohne geladene Liste wird kein Formular angeboten.
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Erneut laden' }));

    expect(await screen.findByRole('heading', { name: 'Datenbanksysteme' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(mockList).toHaveBeenCalledTimes(2);
  });
});

describe('CoursesPage – Anlegen', () => {
  it('legt eine LV an, zeigt sie sortiert in der Liste und leert das Feld', async () => {
    await renderLoaded([DBS, SWE]);
    mockCreate.mockResolvedValue(ALGO);

    const input = screen.getByLabelText('Name') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '  Algorithmen  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Anlegen' }));

    expect(await screen.findByRole('heading', { name: 'Algorithmen' })).toBeInTheDocument();
    expect(mockCreate).toHaveBeenCalledWith('Algorithmen'); // ohne Leerzeichen am Rand
    expect(itemNames()).toEqual(['Algorithmen', 'Datenbanksysteme', 'Software Engineering']);
    expect(input.value).toBe('');
    expect(screen.getByRole('status')).toHaveTextContent('„Algorithmen“ wurde angelegt.');
    // Die Liste wird nicht neu vom Server geladen.
    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it('fängt einen leeren Namen ab, ohne das Backend aufzurufen', async () => {
    await renderLoaded();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Anlegen' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Bitte geben Sie einen Namen ein.');
    expect(mockCreate).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('blendet die Fehlermeldung beim Weitertippen wieder aus', async () => {
    await renderLoaded();

    fireEvent.click(screen.getByRole('button', { name: 'Anlegen' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'N' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('zeigt einen doppelten Namen verständlich an und behält die Eingabe', async () => {
    await renderLoaded();
    mockCreate.mockRejectedValue(new ApiError('A course with this name already exists', 409));

    const input = screen.getByLabelText('Name') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'datenbanksysteme' } });
    fireEvent.click(screen.getByRole('button', { name: 'Anlegen' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Eine Lehrveranstaltung mit diesem Namen gibt es bereits.'
    );
    expect(input.value).toBe('datenbanksysteme');
    expect(itemNames()).toEqual(['Datenbanksysteme', 'Software Engineering']);
  });

  it('zeigt andere Backend-Fehler beim Anlegen an', async () => {
    await renderLoaded();
    mockCreate.mockRejectedValue(new ApiError('boom', 500));

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Neu' } });
    fireEvent.click(screen.getByRole('button', { name: 'Anlegen' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Serverfehler/);
  });

  it('sperrt den Button, solange angelegt wird', async () => {
    await renderLoaded();
    let resolveCreate: (value: Course) => void = () => {};
    mockCreate.mockReturnValue(new Promise<Course>((resolve) => { resolveCreate = resolve; }));

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Algorithmen' } });
    fireEvent.click(screen.getByRole('button', { name: 'Anlegen' }));

    const pendingButton = await screen.findByRole('button', { name: 'Wird angelegt…' });
    expect(pendingButton).toBeDisabled();
    fireEvent.click(pendingButton);
    expect(mockCreate).toHaveBeenCalledTimes(1);

    resolveCreate(ALGO);
    expect(await screen.findByRole('button', { name: 'Anlegen' })).toBeEnabled();
  });
});

describe('CoursesPage – Umbenennen', () => {
  function startEdit(name: string) {
    fireEvent.click(screen.getByRole('button', { name: `Lehrveranstaltung ${name} umbenennen` }));
    return screen.getByLabelText('Neuer Name') as HTMLInputElement;
  }

  it('benennt eine LV um und sortiert die Liste neu', async () => {
    await renderLoaded([DBS, SWE]);
    mockRename.mockResolvedValue({ ...DBS, name: 'Verteilte Systeme' });

    const input = startEdit('Datenbanksysteme');
    expect(input.value).toBe('Datenbanksysteme');

    fireEvent.change(input, { target: { value: ' Verteilte Systeme ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(await screen.findByRole('heading', { name: 'Verteilte Systeme' })).toBeInTheDocument();
    expect(mockRename).toHaveBeenCalledWith('c-dbs', 'Verteilte Systeme');
    expect(itemNames()).toEqual(['Software Engineering', 'Verteilte Systeme']);
    expect(screen.queryByLabelText('Neuer Name')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      '„Datenbanksysteme“ heißt jetzt „Verteilte Systeme“.'
    );
    // Die Fragenanzahl bleibt erhalten.
    expect(screen.getByText('3 Fragen')).toBeInTheDocument();
  });

  it('Abbrechen verändert nichts', async () => {
    await renderLoaded();

    const input = startEdit('Datenbanksysteme');
    fireEvent.change(input, { target: { value: 'Etwas anderes' } });
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));

    expect(mockRename).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Datenbanksysteme' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Neuer Name')).not.toBeInTheDocument();
  });

  it('Escape bricht das Umbenennen ab', async () => {
    await renderLoaded();

    const input = startEdit('Datenbanksysteme');
    fireEvent.change(input, { target: { value: 'Etwas anderes' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(mockRename).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Datenbanksysteme' })).toBeInTheDocument();
  });

  it('fängt einen leeren Namen ab', async () => {
    await renderLoaded();

    const input = startEdit('Datenbanksysteme');
    fireEvent.change(input, { target: { value: '  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Bitte geben Sie einen Namen ein.');
    expect(mockRename).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Neuer Name')).toBeInTheDocument();
  });

  it('sendet nichts, wenn der Name unverändert ist', async () => {
    await renderLoaded();

    startEdit('Datenbanksysteme');
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    await waitFor(() => expect(screen.queryByLabelText('Neuer Name')).not.toBeInTheDocument());
    expect(mockRename).not.toHaveBeenCalled();
  });

  it('zeigt einen doppelten Namen in der Zeile an und bleibt im Bearbeiten', async () => {
    await renderLoaded();
    mockRename.mockRejectedValue(new ApiError('A course with this name already exists', 409));

    const input = startEdit('Datenbanksysteme');
    fireEvent.change(input, { target: { value: 'Software Engineering' } });
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Eine Lehrveranstaltung mit diesem Namen gibt es bereits.'
    );
    expect((screen.getByLabelText('Neuer Name') as HTMLInputElement).value).toBe(
      'Software Engineering'
    );
    expect(itemNames()).toContain('Software Engineering');
  });

  it('lädt die Liste neu, wenn die LV inzwischen gelöscht wurde', async () => {
    await renderLoaded([DBS, SWE]);
    mockRename.mockRejectedValue(new ApiError('Course not found', 404));
    mockList.mockResolvedValue([SWE]);

    const input = startEdit('Datenbanksysteme');
    fireEvent.change(input, { target: { value: 'Neu' } });
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Diese Lehrveranstaltung gibt es nicht mehr. Die Liste wurde aktualisiert.'
    );
    await waitFor(() => expect(itemNames()).toEqual(['Software Engineering']));
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('lässt immer nur eine Zeile gleichzeitig bearbeiten', async () => {
    await renderLoaded();

    startEdit('Datenbanksysteme');
    startEdit('Software Engineering');

    expect(screen.getAllByLabelText('Neuer Name')).toHaveLength(1);
    expect((screen.getByLabelText('Neuer Name') as HTMLInputElement).value).toBe(
      'Software Engineering'
    );
  });
});

describe('CoursesPage – Löschen', () => {
  function openDeleteDialog(name: string) {
    fireEvent.click(screen.getByRole('button', { name: `Lehrveranstaltung ${name} löschen` }));
    return screen.getByRole('dialog');
  }

  it('fragt vor dem Löschen nach und erklärt, dass die Fragen bleiben', async () => {
    await renderLoaded();

    const dialog = openDeleteDialog('Datenbanksysteme');

    expect(dialog).toHaveTextContent('Lehrveranstaltung löschen');
    expect(dialog).toHaveTextContent('„Datenbanksysteme“');
    expect(dialog).toHaveTextContent(
      'Es werden nur die Lehrveranstaltung und ihre Zuordnungen entfernt.'
    );
    expect(dialog).toHaveTextContent('Die 3 zugeordneten Fragen bleiben im Archiv erhalten.');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('passt den Hinweis an eine bzw. keine zugeordnete Frage an', async () => {
    await renderLoaded([SWE, ALGO]);

    let dialog = openDeleteDialog('Software Engineering');
    expect(dialog).toHaveTextContent('Die zugeordnete Frage bleibt im Archiv erhalten.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Abbrechen' }));

    dialog = openDeleteDialog('Algorithmen');
    expect(dialog).toHaveTextContent('Ihr sind keine Fragen zugeordnet.');
  });

  it('Abbrechen verändert keine Daten', async () => {
    await renderLoaded();

    const dialog = openDeleteDialog('Datenbanksysteme');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Abbrechen' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockDelete).not.toHaveBeenCalled();
    expect(itemNames()).toEqual(['Datenbanksysteme', 'Software Engineering']);
  });

  it('löscht nach Bestätigung und entfernt die LV aus der Liste', async () => {
    await renderLoaded();
    mockDelete.mockResolvedValue({ success: true, course_id: 'c-dbs', removed_assignments: 3 });

    const dialog = openDeleteDialog('Datenbanksysteme');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }));

    await waitFor(() => expect(itemNames()).toEqual(['Software Engineering']));
    expect(mockDelete).toHaveBeenCalledWith('c-dbs');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      '„Datenbanksysteme“ wurde gelöscht. 3 Zuordnungen wurden entfernt, die Fragen bleiben im Archiv erhalten.'
    );
    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it('zeigt nach dem Löschen der letzten LV den Leerzustand', async () => {
    await renderLoaded([ALGO]);
    mockDelete.mockResolvedValue({ success: true, course_id: 'c-algo', removed_assignments: 0 });

    const dialog = openDeleteDialog('Algorithmen');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }));

    expect(await screen.findByText('Noch keine Lehrveranstaltungen angelegt')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('„Algorithmen“ wurde gelöscht.');
  });

  it('zeigt einen Fehler an und behält die LV, wenn das Löschen fehlschlägt', async () => {
    await renderLoaded();
    mockDelete.mockRejectedValue(new ApiError('boom', 500));

    const dialog = openDeleteDialog('Datenbanksysteme');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /„Datenbanksysteme“ konnte nicht gelöscht werden\..*Serverfehler/
    );
    expect(itemNames()).toEqual(['Datenbanksysteme', 'Software Engineering']);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lädt die Liste neu, wenn die LV schon gelöscht war', async () => {
    await renderLoaded([DBS, SWE]);
    mockDelete.mockRejectedValue(new ApiError('Course not found', 404));
    mockList.mockResolvedValue([SWE]);

    const dialog = openDeleteDialog('Datenbanksysteme');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Diese Lehrveranstaltung gibt es nicht mehr. Die Liste wurde aktualisiert.'
    );
    await waitFor(() => expect(itemNames()).toEqual(['Software Engineering']));
  });
});

describe('sortCoursesByName', () => {
  it('sortiert ohne Rücksicht auf Groß-/Kleinschreibung und mit Umlauten', () => {
    const sorted = sortCoursesByName([
      course('1', 'Zeitreihen'),
      course('2', 'ökonomie'),
      course('3', 'Analysis 10'),
      course('4', 'Analysis 2'),
      course('5', 'betriebssysteme'),
    ]);

    expect(sorted.map((c) => c.name)).toEqual([
      'Analysis 2',
      'Analysis 10',
      'betriebssysteme',
      'ökonomie',
      'Zeitreihen',
    ]);
  });

  it('verändert die übergebene Liste nicht', () => {
    const original = [course('1', 'B'), course('2', 'A')];
    sortCoursesByName(original);
    expect(original.map((c) => c.name)).toEqual(['B', 'A']);
  });
});
