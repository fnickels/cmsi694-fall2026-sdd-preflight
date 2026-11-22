import type { ApiErrorCode } from '../shared/types.js';

export class AppError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    options?: { cause?: unknown },
  ) {
    super(code, options);
    this.name = 'AppError';
  }
}

export function httpStatusFor(code: ApiErrorCode): number {
  switch (code) {
    case 'INVALID_INPUT':
      return 400;
    case 'LOCATION_NOT_FOUND':
      return 404;
    case 'WEATHER_UNAVAILABLE':
      return 503;
  }
}
