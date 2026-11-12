// src/services/coursesApi.ts
// API-Calls für Lehrveranstaltungen (LV): laden, anlegen, umbenennen, löschen
// und die LV-Zuordnung einer gespeicherten Frage setzen.

import type {
  Course,
  CourseDeleteResponse,
  QuestionCoursesResponse,
} from '../types/courses';
import { apiCall, API_BASE_URL } from './apiClient';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// Lädt alle Lehrveranstaltungen des angemeldeten Benutzers.
export async function listCourses(): Promise<Course[]> {
  const courses = await apiCall<Course[]>(`${API_BASE_URL}/api/courses`, {
    method: 'GET',
  });
  return courses ?? [];
}

// Lädt eine einzelne Lehrveranstaltung.
export async function getCourse(courseId: string): Promise<Course> {
  return await apiCall<Course>(`${API_BASE_URL}/api/courses/${courseId}`, {
    method: 'GET',
  });
}

// Legt eine neue Lehrveranstaltung an.
export async function createCourse(name: string): Promise<Course> {
  return await apiCall<Course>(`${API_BASE_URL}/api/courses`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ name }),
  });
}

// Benennt eine bestehende Lehrveranstaltung um.
// Bewusst PUT statt PATCH: Das Backend bietet beides an, lässt PATCH aber in der
// CORS-Konfiguration nicht zu. Der Browser würde einen PATCH-Aufruf deshalb blockieren.
export async function renameCourse(courseId: string, name: string): Promise<Course> {
  return await apiCall<Course>(`${API_BASE_URL}/api/courses/${courseId}`, {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify({ name }),
  });
}

// Löscht eine Lehrveranstaltung. Zugeordnete Fragen bleiben erhalten und
// verlieren nur diese Zuordnung.
export async function deleteCourse(courseId: string): Promise<CourseDeleteResponse> {
  return await apiCall<CourseDeleteResponse>(`${API_BASE_URL}/api/courses/${courseId}`, {
    method: 'DELETE',
  });
}

// Setzt die LV-Zuordnungen einer gespeicherten Frage. Die Liste ersetzt die
// bisherigen Zuordnungen vollständig; eine leere Liste entfernt alle.
export async function setQuestionCourses(
  questionId: string,
  courseIds: string[]
): Promise<QuestionCoursesResponse> {
  return await apiCall<QuestionCoursesResponse>(
    `${API_BASE_URL}/api/archive/questions/${questionId}/courses`,
    {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify({ course_ids: courseIds }),
    }
  );
}
