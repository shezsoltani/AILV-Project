// src/components/generate/GenerateForm.tsx
// Darstellung des Generierungsformulars. Logik: useGenerateForm.

import React from 'react';
import { Sparkles } from 'lucide-react';

import {
  QUESTION_TYPE_OPTIONS,
  getQuestionTypeLabel,
} from '../../constants/formConstants';

import type { UseGenerateFormReturn } from '../../hooks/questions/useGenerateForm';
import type { GenerationProvider } from '../../services/generationModelsApi';

import { ErrorBanner, PdfUpload } from '../shared';

const DIFFICULTY_FIELDS = [
  {
    id: 'difficulty-easy',
    name: 'difficultyDistribution.easy',
    label: 'Einfach (%)',
    displayKey: 'difficultyEasy',
    errorKey: 'difficultyEasy',
  },
  {
    id: 'difficulty-medium',
    name: 'difficultyDistribution.medium',
    label: 'Mittel (%)',
    displayKey: 'difficultyMedium',
    errorKey: 'difficultyMedium',
  },
  {
    id: 'difficulty-hard',
    name: 'difficultyDistribution.hard',
    label: 'Schwer (%)',
    displayKey: 'difficultyHard',
    errorKey: 'difficultyHard',
  },
] as const;

const PROVIDER_LABELS: Record<GenerationProvider, string> = {
  openai: 'OpenAI',
  ollama: 'Ollama (lokal)',
};

interface GenerateFormProps {
  form: UseGenerateFormReturn;
  submitError?: string | null;
}

export const GenerateForm: React.FC<GenerateFormProps> = ({
                                                            form,
                                                            submitError = null,
                                                          }) => {
  const {
    formValues,
    courses,
    coursesLoading,
    coursesError,
    reloadCourses,
    toggleCourse,
    clearCourseSelection,
    displayValues,
    errors,
    showSuccessMessage,
    isLoading: formIsLoading,
    models,
    modelsLoading,
    modelsError,
    selectionError,
    selectionValid,
    reloadModels,
    setProvider,
    setModel,
    handleInputChange,
    handleBlur,
    handleKeyDown,
    handleLanguageChange,
    handleTypeToggle,
    handleSubmit,
    setUploadContext,
  } = form;

  // Anbieter ausschließlich aus der Backend-Antwort ableiten.
  const providers = Array.from(
      new Set(models.map((entry) => entry.provider)),
  );

  const selectedProvider = formValues.provider ?? '';

  const selectedModels = models.filter(
      (entry) => entry.provider === selectedProvider,
  );

  const availableSelectedModels = selectedModels.filter(
      (entry) => entry.available,
  );

  const hasAvailableModel = models.some((entry) => entry.available);

  const hasSelectedProvider = providers.some(
      (provider) => provider === selectedProvider,
  );

  const hasSelectedModel = selectedModels.some(
      (entry) => entry.model === formValues.model,
  );

  const selectionDisabled =
      formIsLoading || modelsLoading || Boolean(modelsError);

  const submitDisabled =
      formIsLoading ||
      coursesLoading ||
      !selectionValid ||
      Object.keys(errors).length > 0;

  // Nur für die Anzeige: "Erweiterte Optionen" aufklappen und markieren,
  // wenn dort ein Fehler steht oder kein KI-Modell verfügbar ist.
  const advancedNeedsAttention = Boolean(errors.contextText);

  // Nur für die Anzeige: KI-Menü aufklappen und markieren, wenn dort etwas zu beachten ist.
  const aiNeedsAttention = Boolean(
      modelsError ||
      selectionError ||
      (!modelsLoading && !hasAvailableModel),
  );

  // Aktuelle Wahl für die Kopfzeile, damit man sie auch zugeklappt sieht.
  const aiSummary = [
    hasSelectedProvider ? PROVIDER_LABELS[selectedProvider as GenerationProvider] : '',
    hasSelectedModel ? formValues.model : '',
  ].filter(Boolean).join(' · ');

  const handleProviderChange = (
      event: React.ChangeEvent<HTMLSelectElement>,
  ): void => {
    const value = event.target.value;

    if (value === 'openai' || value === 'ollama') {
      setProvider(value);
    }
  };

  return (
      <div className="card">
        <form className="form form--generate" onSubmit={handleSubmit}>
          {/* KI-Auswahl: dezentes Menü ganz oben, zeigt die aktuelle Wahl und öffnet sich bei Problemen von selbst */}
          <details className="form-advanced form-advanced--ai" open={aiNeedsAttention}>
            <summary className="form-advanced-summary">
              <Sparkles className="form-advanced-icon" aria-hidden="true" />
              KI-Auswahl
              {aiSummary && <span className="form-advanced-hint">{aiSummary}</span>}
              {aiNeedsAttention && (
                  <span className="form-advanced-warning">Bitte prüfen</span>
              )}
            </summary>
            <div className="form-advanced-body">
            {/* KI-Anbieter und Modell */}
            <div className="form-row">
              <p className="form-section-title">KI-Auswahl</p>

              <p className="form-helper">
                Wählen Sie den KI-Anbieter und ein vom Server freigegebenes
                Modell aus.
              </p>

              {modelsLoading && (
                  <p className="form-helper" role="status">
                    KI-Anbieter und Modelle werden geladen …
                  </p>
              )}

              <ErrorBanner message={modelsError} />

              <div className="form-grid form-grid--2">
              <div className="form-group">
                <label className="form-label" htmlFor="provider">
                  KI-Anbieter
                </label>

                <select
                    id="provider"
                    name="provider"
                    className="form-input"
                    value={hasSelectedProvider ? selectedProvider : ''}
                    onChange={handleProviderChange}
                    disabled={selectionDisabled || providers.length === 0}
                    required
                >
                  <option value="" disabled>
                    Anbieter auswählen
                  </option>

                  {providers.map((provider) => (
                      <option key={provider} value={provider}>
                        {PROVIDER_LABELS[provider]}
                      </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="model">
                  Modell
                </label>

                <select
                    id="model"
                    name="model"
                    className="form-input"
                    value={hasSelectedModel ? formValues.model ?? '' : ''}
                    onChange={(event) => setModel(event.target.value)}
                    disabled={
                        selectionDisabled ||
                        availableSelectedModels.length === 0
                    }
                    required
                >
                  <option value="" disabled>
                    {selectedModels.length > 0 &&
                    availableSelectedModels.length === 0
                        ? 'Kein verfügbares Modell'
                        : 'Modell auswählen'}
                  </option>

                  {selectedModels.map((entry) => (
                      <option
                          key={`${entry.provider}:${entry.model}`}
                          value={entry.model}
                          disabled={!entry.available}
                      >
                        {entry.model}
                        {!entry.available ? ' – nicht verfügbar' : ''}
                      </option>
                  ))}
                </select>
              </div>
              </div>

              {!modelsLoading &&
                  !modelsError &&
                  selectedModels
                      .filter((entry) => !entry.available)
                      .map((entry) => (
                          <p
                              key={`${entry.provider}:${entry.model}:reason`}
                              className="form-helper"
                          >
                            {entry.model}:{' '}
                            {entry.reason ?? 'Momentan nicht verfügbar.'}
                          </p>
                      ))}

              {!modelsLoading && !modelsError && !hasAvailableModel && (
                  <p className="form-error-message" role="status">
                    Es ist momentan kein KI-Modell verfügbar. Prüfen Sie
                    die Konfiguration beziehungsweise die Verbindung zum
                    KI-Dienst.
                  </p>
              )}

              {!modelsLoading &&
                  !modelsError &&
                  selectedProvider === 'ollama' &&
                  availableSelectedModels.length > 0 && (
                      <p className="form-helper">
                        Die Generierung erfolgt über den lokalen
                        Ollama-Dienst. Ollama muss während der Generierung
                        laufen.
                      </p>
                  )}

              <ErrorBanner message={selectionError} />

              <button
                  type="button"
                  className="secondary-button form-inline-action"
                  onClick={reloadModels}
                  disabled={formIsLoading || modelsLoading}
              >
                {modelsLoading
                    ? 'Verfügbarkeit wird geprüft …'
                    : 'Verfügbarkeit erneut prüfen'}
              </button>
            </div>
            </div>
          </details>

          {/* Thema */}
          <div className="form-row">
            <label className="form-label" htmlFor="topic">
              Thema *
            </label>

            <input
                id="topic"
                name="topic"
                className={`form-input${
                    errors.topic ? ' form-input--error' : ''
                }`}
                type="text"
                placeholder="Einführung in Algorithmen"
                value={formValues.topic}
                onChange={handleInputChange}
                aria-invalid={Boolean(errors.topic)}
                aria-describedby={errors.topic ? 'topic-error' : undefined}
                required
            />

            {errors.topic && (
                <p id="topic-error" className="form-error-message">
                  {errors.topic}
                </p>
            )}
          </div>

          {/* Lehrveranstaltungen */}
          <div className="form-row">
            <p className="form-section-title">Lehrveranstaltungen (optional)</p>
            <p className="form-helper">
              Wählen Sie eine oder mehrere eigene Lehrveranstaltungen. Ohne Auswahl werden allgemeine Fragen erstellt.
            </p>
            <p className="sr-only" aria-live="polite">
              {(formValues.course_ids ?? []).length === 0
                  ? 'Aktuelle Auswahl: Keine LV / Allgemein'
                  : `Aktuelle Auswahl: ${(formValues.course_ids ?? []).length} Lehrveranstaltung(en)`}
            </p>

            {coursesLoading && (
                <p className="form-helper" role="status">Lehrveranstaltungen werden geladen …</p>
            )}
            {coursesError && (
                <>
                  <ErrorBanner message={coursesError} />
                  <button
                      type="button"
                      className="secondary-button"
                      onClick={reloadCourses}
                      disabled={formIsLoading || coursesLoading}
                  >
                    Erneut laden
                  </button>
                  <p className="form-helper">
                    Ihre bisherige Auswahl bleibt erhalten. Sie können bewusst ohne LV-Zuordnung fortfahren.
                  </p>
                  {(formValues.course_ids ?? []).length > 0 && (
                      <button type="button" className="secondary-button" onClick={clearCourseSelection} disabled={formIsLoading}>
                        Auswahl löschen und ohne LV fortfahren
                      </button>
                  )}
                </>
            )}
            {!coursesLoading && !coursesError && courses.length === 0 && (
                <p className="form-helper">Keine eigenen Lehrveranstaltungen vorhanden – es werden allgemeine Fragen erstellt.</p>
            )}
            {(formValues.course_ids ?? []).some((id) => !courses.some((course) => course.id === id)) && (
                <div className="form-helper" role="status">
                  <p>Ausgewählte, nicht mehr verfügbare Lehrveranstaltungen:</p>
                  {(formValues.course_ids ?? []).filter((id) => !courses.some((course) => course.id === id)).map((id) => (
                      <label key={id} className="form-label checkbox-label checkbox-label--checked">
                        <input type="checkbox" className="form-input" checked onChange={() => toggleCourse(id)} disabled={formIsLoading} />
                        <span>{id} (nicht verfügbar) – Auswahl entfernen</span>
                      </label>
                  ))}
                </div>
            )}
            {courses.length > 0 && (
                <div className="checkbox-group" role="group" aria-label="Lehrveranstaltungen">
                  {courses.map((course) => (
                      <label
                          key={course.id}
                          className={`form-label checkbox-label ${(formValues.course_ids ?? []).includes(course.id) ? 'checkbox-label--checked' : ''}`}
                      >
                        <input
                            type="checkbox"
                            className="form-input"
                            checked={(formValues.course_ids ?? []).includes(course.id)}
                            onChange={() => toggleCourse(course.id)}
                            disabled={formIsLoading}
                        />
                        <span>{course.name}</span>
                      </label>
                  ))}
                </div>
            )}
          </div>

          <div className="form-grid form-grid--2">
          {/* Sprache */}
          <div className="form-row">
            <label className="form-label" htmlFor="language">
              Sprache
            </label>

            <select
                id="language"
                name="language"
                className="form-input"
                value={formValues.language}
                onChange={handleLanguageChange}
            >
              <option value="de">Deutsch (de)</option>
              <option value="en">Englisch (en)</option>
            </select>
          </div>

          {/* Anzahl */}
          <div className="form-row">
            <label className="form-label" htmlFor="count">
              Anzahl Fragen
            </label>

            <div className="form-input-wrapper form-input-wrapper--numeric">
              <input
                  id="count"
                  name="count"
                  className={`form-input${
                      errors.count ? ' form-input--error' : ''
                  }`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={displayValues.count}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  aria-invalid={Boolean(errors.count)}
                  aria-describedby={
                    errors.count ? 'count-error' : undefined
                  }
              />
            </div>

            {errors.count && (
                <p id="count-error" className="form-error-message">
                  {errors.count}
                </p>
            )}
          </div>
          </div>

          {/* Fragetypen */}
          <div className="form-row">
            <p className="form-section-title" id="question-types-label">
              Fragetypen
            </p>

            <p className="form-helper form-helper--normal form-helper--spaced">
              Wählen Sie einen oder mehrere Fragetypen aus, die
              generiert werden sollen.
            </p>

            <div
                className="checkbox-group"
                role="group"
                aria-labelledby="question-types-label"
                aria-describedby={
                  errors.types ? 'question-types-error' : undefined
                }
            >
              {QUESTION_TYPE_OPTIONS.map((type) => (
                  <label
                      key={type}
                      className={`form-label checkbox-label ${
                          formValues.types.includes(type)
                              ? 'checkbox-label--checked'
                              : ''
                      }`}
                  >
                    <input
                        type="checkbox"
                        className="form-input"
                        checked={formValues.types.includes(type)}
                        onChange={() => handleTypeToggle(type)}
                    />

                    <span>{getQuestionTypeLabel(type)}</span>
                  </label>
              ))}
            </div>

            {errors.types && (
                <p
                    id="question-types-error"
                    className="form-error-message"
                >
                  {errors.types}
                </p>
            )}
          </div>

          {/* Schwierigkeitsverteilung */}
          <div className="form-row">
            <p className="form-section-title">
              Schwierigkeitsverteilung (%)
            </p>

            <div className="form-grid form-grid--3">
            {DIFFICULTY_FIELDS.map(
                ({ id, name, label, displayKey, errorKey }) => {
                  const fieldError = errors[errorKey];

                  return (
                      <div className="form-group" key={id}>
                        <label className="form-label" htmlFor={id}>
                          {label}
                        </label>

                        <div className="form-input-wrapper form-input-wrapper--numeric">
                          <input
                              id={id}
                              name={name}
                              className={`form-input${
                                  fieldError || errors.difficulty
                                      ? ' form-input--error'
                                      : ''
                              }`}
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={displayValues[displayKey]}
                              onChange={handleInputChange}
                              onBlur={handleBlur}
                              onKeyDown={handleKeyDown}
                              aria-invalid={Boolean(
                                  fieldError || errors.difficulty,
                              )}
                              aria-describedby={[
                                fieldError ? `${id}-error` : '',
                                errors.difficulty
                                    ? 'difficulty-distribution-error'
                                    : '',
                              ]
                                  .filter(Boolean)
                                  .join(' ') || undefined}
                          />
                        </div>

                        {fieldError && (
                            <p
                                id={`${id}-error`}
                                className="form-error-message"
                            >
                              {fieldError}
                            </p>
                        )}
                      </div>
                  );
                },
            )}
            </div>

            <p className="form-helper">
              Die Summe aus Einfach, Mittel und Schwer muss 100%
              ergeben.
            </p>

            {errors.difficulty && (
                <p
                    id="difficulty-distribution-error"
                    className="form-error-message"
                >
                  {errors.difficulty}
                </p>
            )}
          </div>


          {/* PDF-Kontext */}
          <div className="form-row form-upload-section">
            <p className="form-section-title form-section-title--flush">
              Dokumenten-Kontext (PDF)
            </p>

            <PdfUpload onExtractedText={setUploadContext} />

            {formValues.uploadContext && (
                <div className="form-upload-preview">
                  <label
                      className="form-label"
                      htmlFor="upload-context-preview"
                  >
                    Extrahierter Text bereit für die Generierung
                  </label>

                  <textarea
                      id="upload-context-preview"
                      className="form-input form-input--readonly"
                      readOnly
                      rows={5}
                      value={formValues.uploadContext}
                  />

                  <button
                      type="button"
                      className="primary-button danger-button"
                      onClick={() => setUploadContext(undefined)}
                  >
                    PDF-Kontext entfernen
                  </button>
                </div>
            )}
          </div>

          {/* Selten nötige Einstellung: öffnet sich von selbst, wenn dort ein Fehler steht */}
          <details className="form-advanced" open={advancedNeedsAttention}>
            <summary className="form-advanced-summary">
              Erweiterte Optionen
              <span className="form-advanced-hint">Zusätzlicher Text</span>
              {advancedNeedsAttention && (
                  <span className="form-advanced-warning">Bitte prüfen</span>
              )}
            </summary>
            <div className="form-advanced-body">
              {/* Manueller Kontext */}
              <div className="form-row">
                <p className="form-section-title">Manueller Kontext</p>

                <label className="form-label" htmlFor="contextText">
                  Zusätzlicher Text (optional)
                </label>

                <textarea
                    id="contextText"
                    name="contextText"
                    className={`form-input${
                        errors.contextText ? ' form-input--error' : ''
                    }`}
                    placeholder="Fügen Sie hier relevante Hintergrundinformationen ein …"
                    rows={4}
                    value={formValues.contextText ?? ''}
                    onChange={handleInputChange}
                    aria-invalid={Boolean(errors.contextText)}
                    aria-describedby={
                      errors.contextText ? 'context-text-error' : undefined
                    }
                />

                {errors.contextText && (
                    <p id="context-text-error" className="form-error-message">
                      {errors.contextText}
                    </p>
                )}

                <p className="form-helper">
                  Ergänzende Informationen, die zusätzlich zum PDF oder
                  stattdessen bei der Fragengenerierung berücksichtigt
                  werden sollen.
                </p>
              </div>
            </div>
          </details>

          {/* Absenden */}
          <button
              type="submit"
              className="primary-button form-submit-button"
              disabled={submitDisabled}
              aria-busy={formIsLoading}
          >
            {formIsLoading ? 'Wird generiert …' : 'Fragen generieren'}
          </button>

          <ErrorBanner message={submitError} />
        </form>

        {showSuccessMessage &&
            !submitError &&
            !selectionError &&
            !modelsError && (
                <p className="form-success-message">
                  Formulardaten erfasst
                </p>
            )}
      </div>
  );
};