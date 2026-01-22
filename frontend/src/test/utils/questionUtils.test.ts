import { describe, it, expect } from 'vitest';
import { calculateQuestionDiff } from '../../utils/questionUtils';
import type { GeneratedQuestion } from '../../types/generatedQuestion';

describe('questionUtils', () => {
  it('sollte nur geänderte Felder zurückgeben', () => {
    const original: GeneratedQuestion[] = [{
      id: 'uuid-1',
      question: 'Originale Frage',
      type: 'SHORT_ANSWER',
      difficulty: 'easy'
    }]; //

    const current: GeneratedQuestion[] = [{
      ...original[0],
      question: 'Geänderte Frage'
    }];

    const result = calculateQuestionDiff(current, original); //
    
    expect(result[0].generated_question_id).toBe('uuid-1'); //
    expect(result[0].stem).toBe('Geänderte Frage'); //
    expect(result[0].difficulty).toBeUndefined(); // Feld wurde nicht geändert
  });
});