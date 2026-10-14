/**
 * Formats numeric values with fallback for null/undefined.
 * @param value Number to format
 * @param digits Decimal places (defaults to 1)
 */
export function format(value: number | null | undefined, digits = 1): string {
  if (value == null) return "—";
  return value.toFixed(digits);
}

/**
 * Formats coordinates for display (e.g. 28.614°N, 77.209°E)
 */
export function formatCoordinates(lat: number, lon: number): string {
  const latStr = `${Math.abs(lat).toFixed(3)}°${lat >= 0 ? "N" : "S"}`;
  const lonStr = `${Math.abs(lon).toFixed(3)}°${lon >= 0 ? "E" : "W"}`;
  return `${latStr}, ${lonStr}`;
}
