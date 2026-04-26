import { describe, expect, it } from 'vitest';
import { ApiError } from '../../error-handling/AppErrors';
import { getUserFriendlyMessage } from '../../error-handling/errorMappers';

describe('errorMappers', () => {
  it('mappt invalid_slide_outline auf eine nutzerfreundliche Meldung', () => {
    const error = new ApiError('backend detail', 422, 'invalid_slide_outline');

    expect(getUserFriendlyMessage(error)).toBe(
      'Die erzeugte Folienstruktur ist ungültig. Bitte versuchen Sie es erneut.',
    );
  });

  it('mappt invalid_slides_content auf eine nutzerfreundliche Meldung', () => {
    const error = new ApiError('backend detail', 422, 'invalid_slides_content');

    expect(getUserFriendlyMessage(error)).toBe(
      'Der erzeugte Folieninhalt ist ungültig. Bitte versuchen Sie es erneut.',
    );
  });

  it('mappt invalid_slides_improved_content auf eine nutzerfreundliche Meldung', () => {
    const error = new ApiError('backend detail', 422, 'invalid_slides_improved_content');

    expect(getUserFriendlyMessage(error)).toBe(
      'Die verbesserte Folienversion ist ungültig. Bitte versuchen Sie es erneut.',
    );
  });
});
