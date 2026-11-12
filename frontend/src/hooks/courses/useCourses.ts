// src/hooks/courses/useCourses.ts
// Lädt die eigenen Lehrveranstaltungen und hält die Liste nach Anlegen,
// Umbenennen und Löschen aktuell, ohne die ganze Seite neu zu laden.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createCourse,
  deleteCourse,
  listCourses,
  renameCourse,
} from '../../services/coursesApi';
import { getCourseErrorMessage } from '../../error-handling/errorMappers';
import type { Course, CourseDeleteResponse } from '../../types/courses';

// Sortiert nach Namen, damit die Liste nach jeder Änderung gleich aufgebaut ist.
export function sortCoursesByName(courses: Course[]): Course[] {
  return [...courses].sort((a, b) =>
    a.name.localeCompare(b.name, 'de', { sensitivity: 'base', numeric: true })
  );
}

export interface UseCoursesResult {
  courses: Course[];
  isLoading: boolean;
  loadError: string | null;
  reload: (options?: { silent?: boolean }) => Promise<void>;
  addCourse: (name: string) => Promise<Course>;
  updateCourseName: (courseId: string, name: string) => Promise<Course>;
  removeCourse: (courseId: string) => Promise<CourseDeleteResponse>;
}

export function useCourses(): UseCoursesResult {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Verhindert, dass eine ältere Antwort eine neuere überschreibt
  // oder nach dem Verlassen der Seite noch State gesetzt wird.
  const latestRequest = useRef(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const reload = useCallback(async (options?: { silent?: boolean }) => {
    const requestId = ++latestRequest.current;
    const silent = options?.silent ?? false;

    if (!silent) {
      setIsLoading(true);
      setLoadError(null);
    }

    try {
      const loaded = await listCourses();
      if (!isMounted.current || requestId !== latestRequest.current) return;
      setCourses(sortCoursesByName(loaded));
      setLoadError(null);
    } catch (error) {
      if (!isMounted.current || requestId !== latestRequest.current) return;
      // Beim stillen Nachladen bleibt die vorhandene Liste sichtbar.
      if (!silent) {
        setLoadError(getCourseErrorMessage(error));
      }
    } finally {
      if (isMounted.current && requestId === latestRequest.current && !silent) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addCourse = useCallback(async (name: string) => {
    const created = await createCourse(name);
    if (isMounted.current) {
      setCourses((previous) => sortCoursesByName([...previous, created]));
    }
    return created;
  }, []);

  const updateCourseName = useCallback(async (courseId: string, name: string) => {
    const updated = await renameCourse(courseId, name);
    if (isMounted.current) {
      setCourses((previous) =>
        sortCoursesByName(
          previous.map((course) => (course.id === courseId ? updated : course))
        )
      );
    }
    return updated;
  }, []);

  const removeCourse = useCallback(async (courseId: string) => {
    const response = await deleteCourse(courseId);
    if (isMounted.current) {
      setCourses((previous) => previous.filter((course) => course.id !== courseId));
    }
    return response;
  }, []);

  return {
    courses,
    isLoading,
    loadError,
    reload,
    addCourse,
    updateCourseName,
    removeCourse,
  };
}
