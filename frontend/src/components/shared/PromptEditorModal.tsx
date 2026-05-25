// src/components/shared/PromptEditorModal.tsx
// Read-only Modal zur Anzeige gerenderter Prompt-Texte pro Stage (Vorschau vor Generierung).

import { Modal } from './Modal';
import type { RenderedPrompt } from '../../types/prompts';

interface PromptEditorModalProps {
  prompts: RenderedPrompt[];
  isOpen: boolean;
  onClose: () => void;
}

export function PromptEditorModal({
  prompts,
  isOpen,
  onClose,
}: PromptEditorModalProps) {
  if (!isOpen) return null;

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
            <h3 className="prompt-editor-modal-stage-title">{prompt.stage}</h3>
            <textarea
              className="form-textarea prompt-editor-modal-textarea"
              value={prompt.prompt_text}
              readOnly
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
        </div>
      </div>
    </Modal>
  );
}
