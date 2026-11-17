import { useCallback } from 'react';
import { ApiError } from '../api';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

const OPTIONS: PositionOptions = { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 };

/** Returns a function that asks the browser for its position (FR-007). */
export function useGeolocation(): () => Promise<Coordinates> {
  return useCallback(
    () =>
      new Promise<Coordinates>((resolve, reject) => {
        const geo = (navigator as Partial<Navigator>).geolocation;
        if (!geo) {
          reject(new ApiError('POSITION_UNAVAILABLE'));
          return;
        }
        geo.getCurrentPosition(
          (p) => {
            resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude });
          },
          (err) => {
            reject(new ApiError(err.code === 1 ? 'PERMISSION_DENIED' : 'POSITION_UNAVAILABLE'));
          },
          OPTIONS,
        );
      }),
    [],
  );
}
