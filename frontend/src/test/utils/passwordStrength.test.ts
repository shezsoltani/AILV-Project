import { describe, expect, it } from 'vitest';
import { getPasswordStrength } from '../../utils/passwordStrength';

describe('getPasswordStrength', () => {
  it('liefert empty bei leerem Passwort', () => {
    const r = getPasswordStrength('');
    expect(r.level).toBe('empty');
    expect(r.segmentsFilled).toBe(0);
    expect(r.label).toBe('');
  });

  it('bewertet zu kurze Passwörter als schwach', () => {
    const r = getPasswordStrength('Ab1!');
    expect(r.level).toBe('weak');
    expect(r.label).toBe('Zu kurz');
  });

  it('bewertet langes einfaches Passwort mindestens als schwach oder mittel', () => {
    const r = getPasswordStrength('abcdefgh');
    expect(['weak', 'medium']).toContain(r.level);
  });

  it('bewertet komplexes Passwort als stark', () => {
    const r = getPasswordStrength('MyStr0ng!Pass');
    expect(r.level).toBe('strong');
    expect(r.segmentsFilled).toBe(3);
  });
});
