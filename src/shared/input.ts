export const MAX_QUERY_LENGTH = 100;

export type QueryValidation =
  { ok: true; value: string } | { ok: false; code: 'EMPTY_INPUT' | 'INPUT_TOO_LONG' };

export function validateQuery(raw: string): QueryValidation {
  const value = raw.trim();
  if (value.length === 0) return { ok: false, code: 'EMPTY_INPUT' };
  if (value.length > MAX_QUERY_LENGTH) return { ok: false, code: 'INPUT_TOO_LONG' };
  return { ok: true, value };
}

/** Any 5-digit numeric input is treated as a US ZIP code (spec Edge Cases). */
export function isUsZip(raw: string): boolean {
  return /^\d{5}$/.test(raw.trim());
}
