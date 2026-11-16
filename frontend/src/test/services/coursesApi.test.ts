import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import { ApiError, NetworkError } from '../../error-handling/AppErrors';
import { getCourseErrorMessage } from '../../error-handling/errorMappers';

type CoursesApi = typeof import('../../services/coursesApi');

const COURSE = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Datenbanksysteme',
  created_at: '2026-11-11T10:00:00Z',
  question_count: 3,
};

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'status',
    headers: new Map([['content-type', 'application/json']]),
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

describe('coursesApi', () => {
  let api: CoursesApi;

  beforeAll(async () => {
    // apiClient liest die Basis-URL beim Import.
    vi.stubEnv('VITE_API_BASE', 'http://backend.test');
    vi.resetModules();
    api = await import('../../services/coursesApi');
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    localStorage.clear();
  });

  function lastCall() {
    const [url, options] = (fetch as any).mock.calls[0];
    return { url: url as string, options: options as RequestInit };
  }

  it('listCourses lädt die LVs mit GET /api/courses und sendet den Token mit', async () => {
    localStorage.setItem('authToken', 'mein-token');
    (fetch as any).mockResolvedValue(jsonResponse(200, [COURSE]));

    const courses = await api.listCourses();

    expect(courses).toEqual([COURSE]);
    const { url, options } = lastCall();
    expect(url).toBe('http://backend.test/api/courses');
    expect(options.method).toBe('GET');
    expect((options.headers as Headers).get('Authorization')).toBe('Bearer mein-token');
  });

  it('getCourse lädt eine einzelne LV', async () => {
    (fetch as any).mockResolvedValue(jsonResponse(200, COURSE));

    await expect(api.getCourse(COURSE.id)).resolves.toEqual(COURSE);
    expect(lastCall().url).toBe(`http://backend.test/api/courses/${COURSE.id}`);
  });

  it('createCourse sendet den Namen mit POST', async () => {
    (fetch as any).mockResolvedValue(jsonResponse(201, COURSE));

    const created = await api.createCourse('Datenbanksysteme');

    expect(created).toEqual(COURSE);
    const { url, options } = lastCall();
    expect(url).toBe('http://backend.test/api/courses');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body as string)).toEqual({ name: 'Datenbanksysteme' });
    expect((options.headers as Headers).get('Content-Type')).toBe('application/json');
  });

  it('renameCourse sendet den neuen Namen mit PUT (PATCH ist per CORS gesperrt)', async () => {
    (fetch as any).mockResolvedValue(jsonResponse(200, { ...COURSE, name: 'DBS 2' }));

    const updated = await api.renameCourse(COURSE.id, 'DBS 2');

    expect(updated.name).toBe('DBS 2');
    const { url, options } = lastCall();
    expect(url).toBe(`http://backend.test/api/courses/${COURSE.id}`);
    expect(options.method).toBe('PUT');
    expect(JSON.parse(options.body as string)).toEqual({ name: 'DBS 2' });
  });

  it('deleteCourse löscht mit DELETE und liefert die Anzahl entfernter Zuordnungen', async () => {
    (fetch as any).mockResolvedValue(
      jsonResponse(200, { success: true, course_id: COURSE.id, removed_assignments: 3 })
    );

    const response = await api.deleteCourse(COURSE.id);

    expect(response.removed_assignments).toBe(3);
    const { url, options } = lastCall();
    expect(url).toBe(`http://backend.test/api/courses/${COURSE.id}`);
    expect(options.method).toBe('DELETE');
  });

  it('setQuestionCourses sendet course_ids als Liste mit PUT', async () => {
    (fetch as any).mockResolvedValue(
      jsonResponse(200, { question_id: 'q1', course_ids: [COURSE.id] })
    );

    const response = await api.setQuestionCourses('q1', [COURSE.id]);

    expect(response.course_ids).toEqual([COURSE.id]);
    const { url, options } = lastCall();
    expect(url).toBe('http://backend.test/api/archive/questions/q1/courses');
    expect(options.method).toBe('PUT');
    expect(JSON.parse(options.body as string)).toEqual({ course_ids: [COURSE.id] });
  });

  it('setQuestionCourses sendet eine leere Liste, um alle Zuordnungen zu entfernen', async () => {
    (fetch as any).mockResolvedValue(jsonResponse(200, { question_id: 'q1', course_ids: [] }));

    await api.setQuestionCourses('q1', []);

    expect(JSON.parse(lastCall().options.body as string)).toEqual({ course_ids: [] });
  });

  it('ein doppelter Name (409) wird zu einer verständlichen Meldung', async () => {
    (fetch as any).mockResolvedValue(
      jsonResponse(409, { detail: 'A course with this name already exists' })
    );

    const error = await api.createCourse('Datenbanksysteme').catch((e) => e);

    expect(error.name).toBe('ApiError');
    expect(error.statusCode).toBe(409);
    expect(getCourseErrorMessage(new ApiError(error.message, 409))).toBe(
      'Eine Lehrveranstaltung mit diesem Namen gibt es bereits.'
    );
  });

  it('eine nicht mehr vorhandene LV (404) wird zu einer verständlichen Meldung', () => {
    expect(getCourseErrorMessage(new ApiError('Course not found', 404))).toBe(
      'Diese Lehrveranstaltung gibt es nicht mehr.'
    );
  });

  it('andere Fehler verwenden die allgemeinen Meldungen', () => {
    expect(getCourseErrorMessage(new ApiError('boom', 500))).toMatch(/Serverfehler/);
    expect(getCourseErrorMessage(new NetworkError('Backend nicht erreichbar.'))).toBe(
      'Backend nicht erreichbar.'
    );
  });
});
