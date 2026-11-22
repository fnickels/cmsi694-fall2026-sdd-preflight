/** e.g. (36.5785, -118.2923) → "36.58° N, 118.29° W" (FR-007). */
export function formatCoordLabel(lat: number, lon: number): string {
  const ns = lat < 0 ? 'S' : 'N';
  const ew = lon < 0 ? 'W' : 'E';
  return `${Math.abs(lat).toFixed(2)}° ${ns}, ${Math.abs(lon).toFixed(2)}° ${ew}`;
}
