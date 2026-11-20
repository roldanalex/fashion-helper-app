import { tempToSeasonBands } from "@/lib/weather-bands";
import { RAIN_PROB_THRESHOLD } from "@/lib/constants";
import type { ClothingItem, Combination } from "@/types/database";

export interface DayWeather {
  /** Expected temperature in °C, or null when unknown (no filtering). */
  tempC: number | null;
  rainy: boolean;
}

const RAIN_UNSAFE = new Set(["suede", "canvas"]);

/** Whether a precipitation chance counts as a rainy day. */
export function isRainy(precipProb: number | null | undefined): boolean {
  return (precipProb ?? 0) > RAIN_PROB_THRESHOLD;
}

/**
 * Whether an Outfit suits the day: one of its seasons matches the
 * temperature band, and no suede or canvas shoes in the rain.
 */
export function suitsWeather(
  combo: Pick<Combination, "season_suitability" | "shoes_id">,
  piecesById: Map<string, Pick<ClothingItem, "material">>,
  weather: DayWeather,
): boolean {
  if (weather.tempC != null) {
    const bands = new Set(tempToSeasonBands(weather.tempC));
    if (!combo.season_suitability.some((s) => bands.has(s))) return false;
  }
  if (weather.rainy && RAIN_UNSAFE.has(piecesById.get(combo.shoes_id)?.material ?? "")) return false;
  return true;
}
