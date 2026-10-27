/** Temperature unit preference. Pure, client-safe. Stored on profiles.units. */
export type Units = "metric" | "imperial";

export const UNIT_SYMBOL: Record<Units, string> = { metric: "°C", imperial: "°F" };

export function cToF(c: number): number {
  return (c * 9) / 5 + 32;
}

/** Whole-degree reading in the user's unit. Forecast data is always °C. */
export function toDisplayTemp(tempC: number, units: Units): number {
  return Math.round(units === "imperial" ? cToF(tempC) : tempC);
}

/** "18°C" or "64°F". */
export function formatTemp(tempC: number, units: Units): string {
  return `${toDisplayTemp(tempC, units)}${UNIT_SYMBOL[units]}`;
}

/** "12–19°" style range, unit implied by the reading next to it. */
export function formatTempRange(minC: number, maxC: number, units: Units): string {
  return `${toDisplayTemp(minC, units)}–${toDisplayTemp(maxC, units)}°`;
}

/**
 * Countries where everyday weather is read in °F (ISO 3166 alpha-2, as
 * OpenWeatherMap returns them). Used only as a first guess at onboarding;
 * the user can flip it anywhere a temperature shows.
 */
export const FAHRENHEIT_COUNTRIES = new Set([
  "US", "PR", "GU", "VI", "AS", "MP", // United States and territories
  "BS", "BZ", "KY", "LR", "MM", "PW", "FM", "MH",
]);

export function defaultUnitsForCountry(country: string | null | undefined): Units {
  return country && FAHRENHEIT_COUNTRIES.has(country.toUpperCase()) ? "imperial" : "metric";
}
