import { describe, it, expect } from 'vitest';
import {
  COURSE_NAME_MAX_LENGTH,
  normalizeCourseName,
  validateCourseName,
} from '../../validators/courseValidator';

describe('courseValidator', () => {
  it('akzeptiert einen normalen Namen', () => {
    expect(validateCourseName('Datenbanksysteme')).toBeNull();
  });

  it.each(['', '   ', '\t\n'])('lehnt leere Namen ab (%j)', (value) => {
    expect(validateCourseName(value)).toBe('Bitte geben Sie einen Namen ein.');
  });

  it('akzeptiert genau die maximale Länge', () => {
    expect(validateCourseName('a'.repeat(COURSE_NAME_MAX_LENGTH))).toBeNull();
  });

  it('lehnt zu lange Namen ab', () => {
    expect(validateCourseName('a'.repeat(COURSE_NAME_MAX_LENGTH + 1))).toMatch(/höchstens 255 Zeichen/);
  });

  it('zählt Leerzeichen am Rand nicht zur Länge', () => {
    expect(validateCourseName('  ' + 'a'.repeat(COURSE_NAME_MAX_LENGTH) + '  ')).toBeNull();
  });

  it('entfernt Leerzeichen am Anfang und Ende', () => {
    expect(normalizeCourseName('  Software Engineering  ')).toBe('Software Engineering');
  });
});
