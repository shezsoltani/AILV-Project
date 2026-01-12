import { describe, it, expect } from 'vitest';
import { validate } from '../../validators/generateValidator';
import { DEFAULT_FORM_VALUES } from '../../constants/formConstants';

describe('generateValidator', () => {
  it('sollte einen Fehler melden, wenn das Thema weniger als 3 Zeichen hat', () => {
    const input = { ...DEFAULT_FORM_VALUES, topic: 'Ab' }; //
    const errors = validate(input); //
    expect(errors.topic).toBe('Thema muss mindestens 3 Zeichen lang sein.'); //
  });

  it('sollte einen Fehler melden, wenn die Schwierigkeitssumme nicht 100% ist', () => {
    const input = {
      ...DEFAULT_FORM_VALUES,
      difficultyDistribution: { easy: 50, medium: 10, hard: 10 } // Summe 70
    };
    const errors = validate(input); //
    expect(errors.difficulty).toContain('muss exakt 100% ergeben.'); //
  });
});