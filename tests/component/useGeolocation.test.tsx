import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useGeolocation } from '../../src/client/hooks/useGeolocation';

/** Stubs navigator.geolocation: a number simulates that GeolocationPositionError code. */
function stubGeolocation(outcome: 'success' | number | 'missing') {
  const getCurrentPosition = vi.fn((success: PositionCallback, error: PositionErrorCallback) => {
    if (outcome === 'success') {
      success({ coords: { latitude: 34.0536923, longitude: -118.2427676 } } as GeolocationPosition);
    } else {
      error({ code: outcome, message: 'stub' } as GeolocationPositionError);
    }
  });
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: outcome === 'missing' ? undefined : { getCurrentPosition },
  });
  return getCurrentPosition;
}

afterEach(() => {
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
});

describe('useGeolocation', () => {
  it('resolves the raw coordinates', async () => {
    const getCurrentPosition = stubGeolocation('success');
    const { result } = renderHook(() => useGeolocation());
    await expect(result.current()).resolves.toEqual({
      latitude: 34.0536923,
      longitude: -118.2427676,
    });
    expect(getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), {
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 60_000,
    });
  });

  it.each([
    [1, 'PERMISSION_DENIED'],
    [2, 'POSITION_UNAVAILABLE'],
    [3, 'POSITION_UNAVAILABLE'],
  ])('maps error code %i to %s', async (code, expected) => {
    stubGeolocation(code);
    const { result } = renderHook(() => useGeolocation());
    await expect(result.current()).rejects.toMatchObject({ code: expected });
  });

  it('reports POSITION_UNAVAILABLE without the Geolocation API', async () => {
    stubGeolocation('missing');
    const { result } = renderHook(() => useGeolocation());
    await expect(result.current()).rejects.toMatchObject({ code: 'POSITION_UNAVAILABLE' });
  });
});
