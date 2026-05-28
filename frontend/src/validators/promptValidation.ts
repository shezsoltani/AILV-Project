// src/validators/promptValidation.ts
// Client-seitige Validierung für Custom Prompts (spiegelt custom_prompt_validator.py).

// Pflicht-Platzhalter pro Stage — ohne diese schlägt die Generierung fehl
const REQUIRED_PLACEHOLDERS: Record<string, string[]> = {
  CONTENT: ['{{skeleton_data}}'],
  IMPROVE: ['{{questions_raw}}'],
  SLIDES_CONTENT: ['{{outline_data}}'],
  SLIDES_IMPROVE: ['{{slides_raw}}'],
};

// stage → fehlende Pflicht-Platzhalter
export interface PromptValidationErrors {
  [stage: string]: string[];
}

// Prüft fehlende Pflicht-Platzhalter für eine Stage
export function validatePromptStage(stage: string, promptText: string): string[] {
  const required = REQUIRED_PLACEHOLDERS[stage] ?? [];
  return required.filter((placeholder) => !promptText.includes(placeholder));
}

// Validiert alle bearbeiteten Prompts; nur Stages mit Fehlern im Ergebnis
export function validatePrompts(
  editedTexts: Record<string, string>
): PromptValidationErrors {
  const errors: PromptValidationErrors = {};

  for (const [stage, text] of Object.entries(editedTexts)) {
    const missing = validatePromptStage(stage, text);
    if (missing.length > 0) {
      errors[stage] = missing;
    }
  }

  return errors;
}

// true wenn alle Prompts valide sind
export function arePromptsValid(editedTexts: Record<string, string>): boolean {
  return Object.keys(validatePrompts(editedTexts)).length === 0;
}
