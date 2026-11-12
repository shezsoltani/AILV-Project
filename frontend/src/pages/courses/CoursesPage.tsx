// src/pages/courses/CoursesPage.tsx
// Verwaltung der eigenen Lehrveranstaltungen (LV): anlegen, umbenennen, löschen.

import React, { useEffect, useRef, useState } from 'react';
import { CourseListItem } from '../../components/courses';
import { ConfirmDialog, ErrorBanner } from '../../components/shared';
import { useCourses } from '../../hooks/courses/useCourses';
import { getCourseErrorMessage } from '../../error-handling/errorMappers';
import { ApiError } from '../../error-handling/AppErrors';
import type { Course } from '../../types/courses';
import { formatDateToGerman } from '../../utils/dateUtils';
import {
  COURSE_NAME_MAX_LENGTH,
  normalizeCourseName,
  validateCourseName,
} from '../../validators/courseValidator';

// So lange bleibt eine Erfolgsmeldung sichtbar.
const SUCCESS_MESSAGE_TIME_MS = 5000;

const COURSE_GONE_MESSAGE =
  'Diese Lehrveranstaltung gibt es nicht mehr. Die Liste wurde aktualisiert.';

function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.statusCode === 404;
}

function buildDeleteDescription(course: Course): string {
  const base = `Möchten Sie die Lehrveranstaltung „${course.name}“ wirklich löschen? `;

  if (course.question_count === 0) {
    return base + 'Ihr sind keine Fragen zugeordnet. Es werden keine Fragen gelöscht.';
  }

  const questions =
    course.question_count === 1
      ? 'Die zugeordnete Frage bleibt'
      : `Die ${course.question_count} zugeordneten Fragen bleiben`;

  return (
    base +
    'Es werden nur die Lehrveranstaltung und ihre Zuordnungen entfernt. ' +
    `${questions} im Archiv erhalten.`
  );
}

function buildDeleteSuccess(name: string, removedAssignments: number): string {
  if (removedAssignments === 0) {
    return `„${name}“ wurde gelöscht.`;
  }

  const assignments =
    removedAssignments === 1
      ? 'Eine Zuordnung wurde entfernt, die Frage bleibt'
      : `${removedAssignments} Zuordnungen wurden entfernt, die Fragen bleiben`;

  return `„${name}“ wurde gelöscht. ${assignments} im Archiv erhalten.`;
}

export const CoursesPage: React.FC = () => {
  const {
    courses,
    isLoading,
    loadError,
    reload,
    addCourse,
    updateCourseName,
    removeCourse,
  } = useCourses();

  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const newNameInputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  // Meldungen stehen über der Liste. Wer weiter unten in der Liste etwas ändert,
  // soll die Meldung trotzdem sehen.
  useEffect(() => {
    if (!actionError && !successMessage) return;
    const element = messagesRef.current;
    if (element && typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [actionError, successMessage]);

  // Erfolgsmeldung nach kurzer Zeit wieder ausblenden.
  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(() => setSuccessMessage(null), SUCCESS_MESSAGE_TIME_MS);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const isBusy = isCreating || savingId !== null || isDeleting;

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (isBusy) return;

    const validationError = validateCourseName(newName);
    if (validationError) {
      setCreateError(validationError);
      newNameInputRef.current?.focus();
      return;
    }

    setIsCreating(true);
    setCreateError(null);
    setActionError(null);
    setSuccessMessage(null);

    try {
      const created = await addCourse(normalizeCourseName(newName));
      setNewName('');
      setSuccessMessage(`„${created.name}“ wurde angelegt.`);
    } catch (error) {
      setCreateError(getCourseErrorMessage(error));
    } finally {
      setIsCreating(false);
      // Fokus bleibt im Feld, damit gleich die nächste LV eingegeben werden kann.
      window.setTimeout(() => newNameInputRef.current?.focus(), 0);
    }
  }

  function handleStartEdit(courseId: string) {
    setEditingId(courseId);
    setActionError(null);
    setSuccessMessage(null);
  }

  function handleCancelEdit() {
    setEditingId(null);
  }

  async function handleRename(course: Course, name: string): Promise<string | null> {
    setSavingId(course.id);
    setActionError(null);
    setSuccessMessage(null);

    try {
      const updated = await updateCourseName(course.id, name);
      setEditingId(null);
      setSuccessMessage(`„${course.name}“ heißt jetzt „${updated.name}“.`);
      return null;
    } catch (error) {
      if (isNotFound(error)) {
        // Die LV wurde inzwischen gelöscht, z. B. in einem anderen Fenster.
        setEditingId(null);
        setActionError(COURSE_GONE_MESSAGE);
        void reload({ silent: true });
        return null;
      }
      return getCourseErrorMessage(error);
    } finally {
      setSavingId(null);
    }
  }

  function handleDeleteClick(course: Course) {
    setDeleteTarget(course);
    setActionError(null);
    setSuccessMessage(null);
  }

  function handleDeleteCancel() {
    if (isDeleting) return;
    setDeleteTarget(null);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget || isDeleting) return;
    const target = deleteTarget;

    setIsDeleting(true);
    try {
      const response = await removeCourse(target.id);
      setSuccessMessage(buildDeleteSuccess(target.name, response.removed_assignments));
      if (editingId === target.id) setEditingId(null);
    } catch (error) {
      if (isNotFound(error)) {
        setActionError(COURSE_GONE_MESSAGE);
        void reload({ silent: true });
      } else {
        setActionError(
          `„${target.name}“ konnte nicht gelöscht werden. ${getCourseErrorMessage(error)}`
        );
      }
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  const showContent = !isLoading && !loadError;

  return (
    <div className="page courses-page">
      <h1 className="page-title">Lehrveranstaltungen</h1>
      <p className="page-description">
        Hier verwalten Sie Ihre Lehrveranstaltungen. Fragen können Sie einer oder mehreren
        Lehrveranstaltungen zuordnen und im Archiv danach filtern.
      </p>

      {isLoading && (
        <div className="archive-loading-state" role="status">
          <div className="archive-loading-spinner" aria-hidden="true"></div>
          <p>Lehrveranstaltungen werden geladen...</p>
        </div>
      )}

      {!isLoading && loadError && (
        <div className="courses-load-error">
          <ErrorBanner message={loadError} />
          <button type="button" className="secondary-button" onClick={() => void reload()}>
            Erneut laden
          </button>
        </div>
      )}

      {showContent && (
        <>
          <section className="courses-create" aria-labelledby="courses-create-title">
            <h2 id="courses-create-title" className="form-section-title">
              Neue Lehrveranstaltung anlegen
            </h2>
            <form className="courses-create-form" onSubmit={handleCreate} noValidate>
              <div className="courses-create-field">
                <label className="form-label" htmlFor="course-new-name">
                  Name
                </label>
                <input
                  id="course-new-name"
                  ref={newNameInputRef}
                  type="text"
                  className={'form-input' + (createError ? ' form-input--error' : '')}
                  placeholder="z. B. Datenbanksysteme"
                  value={newName}
                  maxLength={COURSE_NAME_MAX_LENGTH}
                  autoComplete="off"
                  // readOnly statt disabled: so bleibt der Fokus im Feld.
                  readOnly={isCreating}
                  aria-invalid={createError ? true : undefined}
                  aria-describedby={createError ? 'course-new-name-error' : undefined}
                  onChange={(event) => {
                    setNewName(event.target.value);
                    if (createError) setCreateError(null);
                  }}
                />
              </div>
              <button
                type="submit"
                className="primary-button courses-create-button"
                disabled={isBusy}
              >
                {isCreating ? 'Wird angelegt…' : 'Anlegen'}
              </button>
            </form>
            {createError && (
              <p id="course-new-name-error" className="form-error-message" role="alert">
                {createError}
              </p>
            )}
          </section>

          {(actionError || successMessage) && (
            <div className="courses-messages" ref={messagesRef}>
              <ErrorBanner message={actionError} className="courses-banner" />

              {successMessage && (
                <div className="success-banner courses-banner" role="status">
                  <div className="success-banner-content">{successMessage}</div>
                </div>
              )}
            </div>
          )}

          {courses.length === 0 ? (
            <div className="archive-empty-state">
              <p className="archive-empty-state-title">
                Noch keine Lehrveranstaltungen angelegt
              </p>
              <p className="archive-empty-state-description">
                Legen Sie oben Ihre erste Lehrveranstaltung an. Ohne Lehrveranstaltung
                bleiben Ihre Fragen allgemein und sind weiterhin im Archiv zu finden.
              </p>
            </div>
          ) : (
            <section className="courses-list-section" aria-labelledby="courses-list-title">
              <h2 id="courses-list-title" className="courses-list-title">
                Ihre Lehrveranstaltungen
                <span className="courses-list-count">{courses.length}</span>
              </h2>
              <ul className="courses-list">
                {courses.map((course) => (
                  <CourseListItem
                    key={course.id}
                    course={course}
                    isEditing={editingId === course.id}
                    isSaving={savingId === course.id}
                    actionsDisabled={isBusy}
                    formatDate={formatDateToGerman}
                    onStartEdit={handleStartEdit}
                    onCancelEdit={handleCancelEdit}
                    onRename={handleRename}
                    onDeleteClick={handleDeleteClick}
                  />
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Lehrveranstaltung löschen"
        description={deleteTarget ? buildDeleteDescription(deleteTarget) : ''}
        confirmLabel="Löschen"
        isLoading={isDeleting}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
};
