import type { ClientErrorCode } from '../shared/types';

/** Copy verbatim from contracts/ui-contract.md › Messages (FR-006). */
export const MESSAGES: Record<ClientErrorCode, string> = {
  EMPTY_INPUT: 'Please enter a city or US ZIP code.',
  INPUT_TOO_LONG: "That's a bit long — please use 100 characters or fewer.",
  LOCATION_NOT_FOUND:
    "We couldn't find that location. Try a city name, or add a region or country.",
  WEATHER_UNAVAILABLE: 'Weather is currently unavailable. Please try again.',
  OFFLINE: 'You appear to be offline. Check your connection and try again.',
  PERMISSION_DENIED: 'Location access was denied. You can still search by name.',
  POSITION_UNAVAILABLE: "We couldn't determine your location. You can still search by name.",
};

export const RETRYABLE: ReadonlySet<ClientErrorCode> = new Set(['WEATHER_UNAVAILABLE', 'OFFLINE']);
