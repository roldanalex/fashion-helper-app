import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireApproved } from "@/lib/access";
import { searchLocations, locationLabel } from "@/lib/weather";

// Typeahead for the Today "Where?" field — returns verified places (with
// lat/lon) so the user picks a real location instead of typing free text
// that may fail to geocode.
export async function GET(request: Request) {
  const supabase = await createClient();
  const { deny } = await requireApproved(supabase);
  if (deny) return deny;

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) return NextResponse.json({ results: [] });

  try {
    const matches = await searchLocations(q, 5);
    const seen = new Set<string>();
    const results = [];
    for (const m of matches) {
      const label = locationLabel(m);
      if (seen.has(label)) continue; // OWM can return duplicates
      seen.add(label);
      results.push({ label, lat: m.lat, lon: m.lon });
    }
    return NextResponse.json({ results });
  } catch (err) {
    console.error("Geocode search failed:", err);
    return NextResponse.json({ results: [] });
  }
}
