import "server-only";
import type { WeatherSnapshot } from "@/types/database";

const GEO_URL = "https://api.openweathermap.org/geo/1.0/direct";
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";

function apiKey() {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) throw new Error("OPENWEATHER_API_KEY is not set");
  return key;
}

export interface GeoResult {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

export async function geocode(query: string): Promise<GeoResult | null> {
  const url = `${GEO_URL}?q=${encodeURIComponent(query)}&limit=1&appid=${apiKey()}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
  const results: GeoResult[] = await res.json();
  return results[0] ?? null;
}

/** Typeahead search — multiple matching places for an autocomplete. */
export async function searchLocations(
  query: string,
  limit = 5,
): Promise<GeoResult[]> {
  const url = `${GEO_URL}?q=${encodeURIComponent(query)}&limit=${limit}&appid=${apiKey()}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`Location search failed (${res.status})`);
  return (await res.json()) as GeoResult[];
}

/** Human-readable "City, State, Country" label for a geocoding match. */
export function locationLabel(g: GeoResult): string {
  return [g.name, g.state, g.country].filter(Boolean).join(", ");
}

interface ForecastSlice {
  dt: number;
  main: { temp: number; feels_like: number; temp_min: number; temp_max: number; humidity: number };
  weather: { main: string; description: string }[];
  pop: number; // probability of precipitation 0..1
}

/**
 * Today's outlook at a location, reduced from the 3-hourly forecast
 * (daytime slices only, so overnight lows don't skew the picture).
 */
export async function getTodayWeather(
  lat: number,
  lon: number,
  locationName: string,
): Promise<WeatherSnapshot> {
  const url = `${FORECAST_URL}?lat=${lat}&lon=${lon}&units=metric&cnt=8&appid=${apiKey()}`;
  const res = await fetch(url, { next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`Weather fetch failed (${res.status})`);
  const data: { list: ForecastSlice[] } = await res.json();

  const slices = data.list.filter((s) => {
    const hour = new Date(s.dt * 1000).getHours();
    return hour >= 7 && hour <= 22;
  });
  const used = slices.length > 0 ? slices : data.list.slice(0, 4);

  const temps = used.map((s) => s.main.temp);
  const tempC = temps.reduce((a, b) => a + b, 0) / temps.length;
  const feelsLikeC =
    used.map((s) => s.main.feels_like).reduce((a, b) => a + b, 0) / used.length;
  const precipProb = Math.round(Math.max(...used.map((s) => s.pop)) * 100);
  const humidity = Math.round(
    used.map((s) => s.main.humidity).reduce((a, b) => a + b, 0) / used.length,
  );
  const condition = used[0]?.weather[0]?.main ?? "Clear";
  const description = used[0]?.weather[0]?.description ?? "clear sky";

  return {
    tempC: Math.round(tempC * 10) / 10,
    feelsLikeC: Math.round(feelsLikeC * 10) / 10,
    tempMinC: Math.round(Math.min(...temps) * 10) / 10,
    tempMaxC: Math.round(Math.max(...temps) * 10) / 10,
    precipProb,
    humidity,
    condition,
    summary: `${Math.round(tempC)}°C, ${description}, ${precipProb}% chance of rain`,
    locationName,
  };
}

/** Map a temperature to the wardrobe season bands it suits. */
export function tempToSeasonBands(tempC: number): string[] {
  if (tempC >= 23) return ["summer"];
  if (tempC >= 15) return ["spring", "fall", "summer"];
  if (tempC >= 5) return ["fall", "winter", "spring"];
  return ["winter"];
}

export function weatherFlags(weather: WeatherSnapshot) {
  return {
    rainy: weather.precipProb > 40,
    cold: weather.feelsLikeC < 15,
    hot: weather.feelsLikeC >= 27,
    seasonBands: tempToSeasonBands(weather.tempC),
  };
}
