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

/* ---------- Body measurements (1.5.2): each has its own unit ---------- */

export type WeightUnit = "kg" | "lb";
export type HeightUnit = "cm" | "ftin";

export interface MeasureUnits {
  weight: WeightUnit;
  height: HeightUnit;
}

/** First guess from the country; the user can change each one in Settings. */
export function defaultMeasuresForCountry(country: string | null | undefined): MeasureUnits {
  const imperial = defaultUnitsForCountry(country) === "imperial";
  return { weight: imperial ? "lb" : "kg", height: imperial ? "ftin" : "cm" };
}

/** Reads a profile's units, falling back to the temperature unit for rows from before 0013. */
export function measuresFrom(profile: {
  units?: Units | null;
  weight_unit?: string | null;
  height_unit?: string | null;
} | null | undefined): MeasureUnits {
  const imperial = profile?.units === "imperial";
  return {
    weight: profile?.weight_unit === "lb" || profile?.weight_unit === "kg" ? profile.weight_unit : imperial ? "lb" : "kg",
    height: profile?.height_unit === "ftin" || profile?.height_unit === "cm" ? profile.height_unit : imperial ? "ftin" : "cm",
  };
}
