const POINTS = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
] as const;

export type CompassPoint = (typeof POINTS)[number];

/** index = round(deg / 22.5) mod 16 (data-model.md). */
export function toCompass16(deg: number): CompassPoint {
  const index = ((Math.round(deg / 22.5) % 16) + 16) % 16;
  return POINTS[index] ?? 'N';
}

/** e.g. 329.6 → "NNW 330°" (FR-003). */
export function formatWindDirection(deg: number | null): string | null {
  if (deg === null) return null;
  return `${toCompass16(deg)} ${Math.round(deg) % 360}°`;
}
