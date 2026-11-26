import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FormEvent } from 'react';
import { ApiError } from '../../error-handling/AppErrors';
import { useForgotPasswordForm } from '../../hooks/auth/useForgotPasswordForm';
import { forgotPassword } from '../../services/authApi';

vi.mock('../../services/authApi', () => ({ forgotPassword: vi.fn() }));

async function submitWith(error: Error) {
  vi.mocked(forgotPassword).mockRejectedValue(error);
  const { result } = renderHook(() => useForgotPasswordForm());
  const event = { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;

  act(() => {
    result.current.handleChange({ target: { value: 'user@example.com' } } as never);
  });
  await act(() => result.current.handleSubmit(event));

  return result.current;
}

describe('useForgotPasswordForm', () => {
  it('zeigt bei zu vielen Versuchen eine Fehlermeldung', async () => {
    const form = await submitWith(new ApiError('Too many attempts', 429, 'auth_rate_limited'));

    expect(form.isSuccess).toBe(false);
    expect(form.submitError).toContain('Zu viele Versuche');
  });

  it('zeigt bei anderen Fehlern trotzdem die Erfolgsmeldung', async () => {
    const form = await submitWith(new ApiError('Server error', 500));

    expect(form.isSuccess).toBe(true);
    expect(form.submitError).toBeNull();
  });
});
