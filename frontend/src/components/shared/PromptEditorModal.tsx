// src/components/shared/PromptEditorModal.tsx
// Modal zur Bearbeitung gerenderter Prompt-Texte pro Stage (Vorschau vor Generierung).

import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import type { RenderedPrompt } from '../../types/prompts';
import { validatePrompts, type PromptValidationErrors } from '../../validators/promptValidation';

interface PromptEditorModalProps {
  prompts: RenderedPrompt[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (editedPrompts: Record<string, string>) => void;
}

function promptsToEditedTexts(prompts: RenderedPrompt[]): Record<string, string> {
  return Object.fromEntries(prompts.map((prompt) => [prompt.stage, prompt.prompt_text]));
}

export function PromptEditorModal({
  prompts,
  isOpen,
  onClose,
  onSave,
}: PromptEditorModalProps) {
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>(() =>
    promptsToEditedTexts(prompts)
  );
  const [validationErrors, setValidationErrors] = useState<PromptValidationErrors>({});

  useEffect(
    function resetEditedTextsOnOpen() {
      if (isOpen) {
        const initial = promptsToEditedTexts(prompts);
        setEditedTexts(initial);
        setValidationErrors(validatePrompts(initial));
      }
    },
    [isOpen] // eslint-disable-line react-hooks/exhaustive-deps -- prompts absichtlich ausgeschlossen
  );

  if (!isOpen) return null;

  function handleTextChange(stage: string, value: string): void {
    const next = { ...editedTexts, [stage]: value };
    setEditedTexts(next);
    setValidationErrors(validatePrompts(next));
  }

  function handleResetStage(stage: string): void {
    const originalText = prompts.find((prompt) => prompt.stage === stage)?.prompt_text ?? '';
    const next = { ...editedTexts, [stage]: originalText };
    setEditedTexts(next);
    setValidationErrors(validatePrompts(next));
  }

  const hasErrors = Object.keys(validationErrors).length > 0;

  function handleApply(): void {
    if (hasErrors) return;
    onSave(editedTexts);
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      title="Prompt-Vorschau"
      onClose={onClose}
      size="large"
      labelledById="prompt-editor-modal-title"
    >
      <div className="prompt-editor-modal">
        {prompts.map((prompt) => {
          const stageErrors = validationErrors[prompt.stage];
          const hasStageError = stageErrors && stageErrors.length > 0;
          return (
            <section key={prompt.stage} className="prompt-editor-modal-stage">
              <div className="prompt-editor-modal-stage-header">
                <h3 className="prompt-editor-modal-stage-title">
                  {hasStageError && (
                    <span className="prompt-editor-modal-warn-icon" aria-hidden="true" title="Pflicht-Platzhalter fehlen">
                      ⚠︎{' '}
                    </span>
                  )}
                  {prompt.stage}
                </h3>
                <button
                  type="button"
                  className="prompt-editor-modal-reset"
                  onClick={() => handleResetStage(prompt.stage)}
                >
                  Zurücksetzen
                </button>
              </div>
              <textarea
                className={`form-textarea prompt-editor-modal-textarea${hasStageError ? ' prompt-editor-modal-textarea--error' : ''}`}
                value={editedTexts[prompt.stage] ?? ''}
                onChange={(event) => handleTextChange(prompt.stage, event.target.value)}
                aria-label={`Prompt für ${prompt.stage}`}
                aria-invalid={hasStageError ? 'true' : 'false'}
                aria-describedby={hasStageError ? `prompt-error-${prompt.stage}` : undefined}
              />
              {hasStageError && (
                <p
                  id={`prompt-error-${prompt.stage}`}
                  className="prompt-editor-modal-error"
                  role="alert"
                >
                  Pflicht-Platzhalter fehlen:{' '}
                  {stageErrors.map((p) => (
                    <code key={p} className="prompt-editor-modal-placeholder">{p}</code>
                  ))}
                </p>
              )}
            </section>
          );
        })}

        <div className="questions-modal-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
          >
            Schließen
          </button>
          <button
            type="button"
            className="primary-button prompt-editor-modal-apply"
            onClick={handleApply}
            disabled={hasErrors}
            title={hasErrors ? 'Bitte fehlende Pflicht-Platzhalter ergänzen.' : undefined}
          >
            Übernehmen
          </button>
        </div>
      </div>
    </Modal>
  );
}

