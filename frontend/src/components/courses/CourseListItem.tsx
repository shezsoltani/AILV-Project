// src/components/courses/CourseListItem.tsx
// Eine Zeile in der LV-Verwaltung: Name, Anzahl der Fragen und die Aktionen
// „Umbenennen“ und „Löschen“. Das Umbenennen passiert direkt in der Zeile.

import React, { useEffect, useState } from 'react';
import type { Course } from '../../types/courses';
import { ESCAPE_KEY } from '../../constants/appConstants';
import {
  COURSE_NAME_MAX_LENGTH,
  normalizeCourseName,
  validateCourseName,
} from '../../validators/courseValidator';

interface CourseListItemProps {
  course: Course;
  isEditing: boolean;
  // true, solange für diese LV gerade gespeichert wird
  isSaving: boolean;
  // true, wenn gerade eine andere Aktion läuft und nichts gestartet werden soll
  actionsDisabled: boolean;
  formatDate: (dateString: string) => string;
  onStartEdit: (courseId: string) => void;
  onCancelEdit: () => void;
  // Gibt eine Fehlermeldung zurück oder null, wenn das Umbenennen geklappt hat.
  onRename: (course: Course, name: string) => Promise<string | null>;
  onDeleteClick: (course: Course) => void;
}

function formatQuestionCount(count: number): string {
  return `${count} ${count === 1 ? 'Frage' : 'Fragen'}`;
}

export const CourseListItem: React.FC<CourseListItemProps> = ({
  course,
  isEditing,
  isSaving,
  actionsDisabled,
  formatDate,
  onStartEdit,
  onCancelEdit,
  onRename,
  onDeleteClick,
}) => {
  const [draftName, setDraftName] = useState(course.name);
  const [error, setError] = useState<string | null>(null);

  const inputId = `course-name-${course.id}`;
  const errorId = `course-name-error-${course.id}`;

  // Beim Öffnen des Bearbeitens immer mit dem aktuellen Namen starten.
  useEffect(() => {
    if (isEditing) {
      setDraftName(course.name);
      setError(null);
    }
  }, [isEditing, course.name]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isSaving) return;

    const validationError = validateCourseName(draftName);
    if (validationError) {
      setError(validationError);
      return;
    }

    const name = normalizeCourseName(draftName);
    // Unveränderter Name: nichts senden, Bearbeiten einfach schließen.
    if (name === course.name) {
      onCancelEdit();
      return;
    }

    setError(null);
    const renameError = await onRename(course, name);
    if (renameError) {
      setError(renameError);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === ESCAPE_KEY && !isSaving) {
      event.preventDefault();
      onCancelEdit();
    }
  }

  if (isEditing) {
    return (
      <li className="course-item course-item--editing">
        <form className="course-item-edit" onSubmit={handleSubmit} noValidate>
          <div className="course-item-edit-field">
            <label className="form-label" htmlFor={inputId}>
              Neuer Name
            </label>
            <input
              id={inputId}
              type="text"
              className={'form-input' + (error ? ' form-input--error' : '')}
              value={draftName}
              maxLength={COURSE_NAME_MAX_LENGTH}
              autoFocus
              autoComplete="off"
              // readOnly statt disabled: so bleibt der Fokus nach einem Fehler im Feld.
              readOnly={isSaving}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              onChange={(event) => {
                setDraftName(event.target.value);
                if (error) setError(null);
              }}
              onKeyDown={handleKeyDown}
            />
            {error && (
              <p id={errorId} className="form-error-message" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="course-item-actions">
            <button
              type="submit"
              className="course-button course-button--primary"
              disabled={isSaving}
            >
              {isSaving ? 'Speichert…' : 'Speichern'}
            </button>
            <button
              type="button"
              className="course-button"
              disabled={isSaving}
              onClick={onCancelEdit}
            >
              Abbrechen
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="course-item">
      <div className="course-item-main">
        <h2 className="course-item-name">{course.name}</h2>
        <div className="course-item-meta">
          <span className="archive-topic-meta-badge archive-topic-meta-badge--count">
            {formatQuestionCount(course.question_count)}
          </span>
          {course.created_at && (
            <span className="course-item-date">
              Angelegt: {formatDate(course.created_at)}
            </span>
          )}
        </div>
      </div>
      <div className="course-item-actions">
        <button
          type="button"
          className="course-button"
          aria-label={`Lehrveranstaltung ${course.name} umbenennen`}
          disabled={actionsDisabled}
          onClick={() => onStartEdit(course.id)}
        >
          Umbenennen
        </button>
        <button
          type="button"
          className="course-button course-button--danger"
          aria-label={`Lehrveranstaltung ${course.name} löschen`}
          disabled={actionsDisabled}
          onClick={() => onDeleteClick(course)}
        >
          Löschen
        </button>
      </div>
    </li>
  );
};
