// src/components/shared/PromptEditorModal.tsx
// Modal zur Bearbeitung gerenderter Prompt-Texte pro Stage (Vorschau vor Generierung).

import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import type { RenderedPrompt } from '../../types/prompts';

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

  useEffect(
    function resetEditedTextsOnOpen() {
      if (isOpen) {
        setEditedTexts(promptsToEditedTexts(prompts));
      }
    },
    [isOpen] // eslint-disable-line react-hooks/exhaustive-deps -- prompts absichtlich ausgeschlossen
  );

  if (!isOpen) return null;

  function handleResetStage(stage: string): void {
    const originalText = prompts.find((prompt) => prompt.stage === stage)?.prompt_text ?? '';
    setEditedTexts((prev) => ({ ...prev, [stage]: originalText }));
  }

  function handleApply(): void {
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
        {prompts.map((prompt) => (
          <section key={prompt.stage} className="prompt-editor-modal-stage">
            <div className="prompt-editor-modal-stage-header">
              <h3 className="prompt-editor-modal-stage-title">{prompt.stage}</h3>
              <button
                type="button"
                className="prompt-editor-modal-reset"
                onClick={() => handleResetStage(prompt.stage)}
              >
                Zurücksetzen
              </button>
            </div>
            <textarea
              className="form-textarea prompt-editor-modal-textarea"
              value={editedTexts[prompt.stage] ?? ''}
              onChange={(event) =>
                setEditedTexts((prev) => ({
                  ...prev,
                  [prompt.stage]: event.target.value,
                }))
              }
              aria-label={`Prompt für ${prompt.stage}`}
            />
          </section>
        ))}

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
          >
            Übernehmen
          </button>
        </div>
      </div>
    </Modal>
  );
}
