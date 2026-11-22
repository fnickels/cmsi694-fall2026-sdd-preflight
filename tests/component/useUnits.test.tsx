import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useUnits } from '../../src/client/hooks/useUnits';

function setLanguage(lang: string) {
  Object.defineProperty(navigator, 'language', { configurable: true, value: lang });
}

afterEach(() => {
  setLanguage('en-US');
});

describe('useUnits', () => {
  it('defaults to imperial for en-US without writing storage', () => {
    setLanguage('en-US');
    const { result } = renderHook(() => useUnits());
    expect(result.current.system).toBe('imperial');
    expect(result.current.explicit).toBe(false);
    expect(localStorage.getItem('weather.units')).toBeNull();
  });

  it('defaults to metric for en-GB', () => {
    setLanguage('en-GB');
    const { result } = renderHook(() => useUnits());
    expect(result.current.system).toBe('metric');
  });

  it('persists an explicit choice', () => {
    setLanguage('en-US');
    const { result } = renderHook(() => useUnits());
    act(() => {
      result.current.setSystem('metric');
    });
    expect(result.current).toMatchObject({ system: 'metric', explicit: true });
    expect(localStorage.getItem('weather.units')).toBe('metric');
  });

  it('prefers a stored choice over the locale', () => {
    setLanguage('en-US');
    localStorage.setItem('weather.units', 'metric');
    const { result } = renderHook(() => useUnits());
    expect(result.current).toMatchObject({ system: 'metric', explicit: true });
  });

  it('ignores an invalid stored value', () => {
    setLanguage('en-US');
    localStorage.setItem('weather.units', 'kelvin');
    const { result } = renderHook(() => useUnits());
    expect(result.current).toMatchObject({ system: 'imperial', explicit: false });
  });
});
