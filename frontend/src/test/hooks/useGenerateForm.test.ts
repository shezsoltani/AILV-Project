import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useGenerateForm } from '../../hooks/questions/useGenerateForm';
import { DEFAULT_FORM_VALUES } from '../../constants/formConstants';

vi.mock('../../services/coursesApi', () => ({
  listCourses: vi.fn().mockResolvedValue([
    { id: 'lv-1', name: 'InnoLab', created_at: '', question_count: 0 },
    { id: 'lv-2', name: 'Projektmanagement', created_at: '', question_count: 0 },
  ]),
}));

describe('useGenerateForm Hook', () => {
  it('sollte mit den Default-Werten initialisieren', () => {
    const { result } = renderHook(() => useGenerateForm({}));

    // Prüfen, ob die Startwerte aus den Konstanten geladen wurden
    expect(result.current.formValues.topic).toBe(DEFAULT_FORM_VALUES.topic);
    expect(result.current.formValues.language).toBe(DEFAULT_FORM_VALUES.language);
  });


  it('sollte ohne LV mit einer leeren course_ids-Liste starten', () => {
    const { result } = renderHook(() => useGenerateForm({}));
    expect(result.current.formValues.course_ids).toEqual([]);
  });

  it('sollte eine und mehrere Lehrveranstaltungen auswählen und wieder abwählen können', () => {
    const { result } = renderHook(() => useGenerateForm({}));
    act(() => result.current.toggleCourse('lv-1'));
    expect(result.current.formValues.course_ids).toEqual(['lv-1']);
    act(() => result.current.toggleCourse('lv-2'));
    expect(result.current.formValues.course_ids).toEqual(['lv-1', 'lv-2']);
    act(() => result.current.toggleCourse('lv-1'));
    expect(result.current.formValues.course_ids).toEqual(['lv-2']);
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