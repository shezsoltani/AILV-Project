// src/utils/archiveCourseUrl.ts
// Link ins Archiv mit vorausgewählter Lehrveranstaltung. Erzeugen und Lesen
// des Query-Parameters stehen hier zusammen, damit beide Seiten übereinstimmen.

export const ARCHIVE_COURSE_PARAM = 'course';

export function buildArchiveCourseUrl(courseId: string): string {
  const params = new URLSearchParams({ [ARCHIVE_COURSE_PARAM]: courseId });
  return `/archive?${params.toString()}`;
}

export function readArchiveCourseIds(searchParams: URLSearchParams): string[] {
  return searchParams.getAll(ARCHIVE_COURSE_PARAM).filter(Boolean);
}
