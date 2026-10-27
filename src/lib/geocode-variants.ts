/**
 * Query variants for OpenWeatherMap's direct geocoder, most specific first.
 * The API reads "City,XX" as city + country code, so "San Francisco, CA"
 * means Canada and matches nothing. Pure and client-safe for testing.
 */
export function geocodeVariants(query: string): string[] {
  const parts = query
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return [];

  const out: string[] = [parts.join(",")];
  const last = parts[parts.length - 1];
  // "City, ST": a two-letter second part is far more often a US state than a country.
  if (parts.length === 2 && /^[A-Za-z]{2}$/.test(last)) out.push(`${parts[0]},${last},US`);
  // "City, State, Country" spelled out: try city + country, then city alone.
  if (parts.length >= 3) out.push(`${parts[0]},${last}`);
  if (parts.length >= 2) out.push(parts[0]);

  return [...new Set(out)];
}
