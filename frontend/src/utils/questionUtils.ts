import type { GeneratedQuestion } from '../types/generatedQuestion';
import type { FinalQuestion } from '../types/api';

// Vergleicht aktuelle mit originalen Fragen und gibt nur die Änderungen zurück
export function calculateQuestionDiff(
  current: GeneratedQuestion[],
  original: GeneratedQuestion[]
): FinalQuestion[] {
  return current.map((q) => {
    // Finde das Original-Objekt
    const originalQ = original.find((oq) => oq.id === q.id);
    
    // Wenn keine Original-Frage gefunden wurde, alle Felder mitsenden
    if (!originalQ) {
      const finalQuestion: FinalQuestion = {
        generated_question_id: q.id,
      };
      
      if (q.question) finalQuestion.stem = q.question;
      if (q.difficulty) finalQuestion.difficulty = q.difficulty;
      if (q.type) finalQuestion.type = q.type;
      if (q.choices) finalQuestion.choices = q.choices;
      if (q.correct_index !== undefined) finalQuestion.correct_index = q.correct_index;
      if (q.rationale) finalQuestion.rationale = q.rationale;
      
      return finalQuestion;
    }

    // Erstelle Objekt mit generated_question_id
    const finalQuestion: FinalQuestion = {
      generated_question_id: q.id,
    };

    // Nur geänderte Felder werden an die API gesendet
    if (q.question !== originalQ.question) {
      finalQuestion.stem = q.question;
    }
    if (q.difficulty !== originalQ.difficulty) {
      finalQuestion.difficulty = q.difficulty;
    }
    if (q.type !== originalQ.type) {
      finalQuestion.type = q.type;
    }
    
    // Prüfen ob sich die Antwortmöglichkeiten geändert haben
    const choicesChanged = (() => {
      const currentChoices = q.choices || [];
      const originalChoices = originalQ.choices || [];
      if (currentChoices.length !== originalChoices.length) return true;
      return currentChoices.some((val, idx) => val !== originalChoices[idx]);
    })();
    if (choicesChanged && q.choices) {
      finalQuestion.choices = q.choices;
    }
    
    if (q.correct_index !== originalQ.correct_index) {
      finalQuestion.correct_index = q.correct_index;
    }
    if (q.rationale !== originalQ.rationale) {
      finalQuestion.rationale = q.rationale;
    }

    return finalQuestion;
  });
}

