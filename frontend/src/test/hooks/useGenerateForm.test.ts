import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useGenerateForm } from '../../hooks/useGenerateForm';
import { DEFAULT_FORM_VALUES } from '../../constants/formConstants';

describe('useGenerateForm Hook', () => {
  it('sollte mit den Default-Werten initialisieren', () => {
    const { result } = renderHook(() => useGenerateForm({}));
    
    // Prüfen, ob die Startwerte aus den Konstanten geladen wurden
    expect(result.current.formValues.topic).toBe(DEFAULT_FORM_VALUES.topic);
    expect(result.current.formValues.language).toBe(DEFAULT_FORM_VALUES.language);
  });

  it('sollte den Themen-State aktualisieren, wenn handleInputChange aufgerufen wird', () => {
    const { result } = renderHook(() => useGenerateForm({}));

    // Simulation einer Eingabe ins "topic"-Feld
    act(() => {
      result.current.handleInputChange({
        target: { name: 'topic', value: 'Web Programmierung' }
      } as any);
    });

    expect(result.current.formValues.topic).toBe('Web Programmierung');
  });
});