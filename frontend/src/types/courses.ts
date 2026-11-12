// src/types/courses.ts
// Gemeinsame Typen für Lehrveranstaltungen (LV). Werden von der LV-Verwaltung,
// dem Fragenformular und dem Archiv verwendet.

// Eine Lehrveranstaltung, wie sie das Backend liefert.
export interface Course {
  id: string;
  name: string;
  created_at: string;
  // Anzahl der gespeicherten Fragen, die dieser LV zugeordnet sind.
  question_count: number;
}

// Antwort auf DELETE /api/courses/{id}. Die Fragen selbst bleiben bestehen.
export interface CourseDeleteResponse {
  success: boolean;
  course_id: string;
  removed_assignments: number;
}

// Antwort auf PUT /api/archive/questions/{question_id}/courses.
export interface QuestionCoursesResponse {
  question_id: string;
  course_ids: string[];
}
