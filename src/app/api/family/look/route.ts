import { NextResponse } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { requireApproved } from "@/lib/access";
import { personSessionFor } from "@/lib/people/session";
import { coordinateFamily, type MemberInput } from "@/lib/groups/coordinate";
import { narrateFamilyLooks } from "@/lib/ai/family";
import { aiLanguageRule } from "@/i18n/config";
import { subjectsFor } from "@/lib/people/subject";
import { seasonOf } from "@/lib/personal/client-profile";
import { enrichCombinations } from "@/lib/combinations/enrich";
import { outfitPieceIds } from "@/lib/wardrobe";
import { geocode, getTodayWeather, getTripForecast, locationLabel } from "@/lib/weather";
import { FAMILY_MAX_PEOPLE, FAMILY_OUTFIT_POOL, OCCASION_WEIGHTS, type Occasion } from "@/lib/constants";
import { isRainy } from "@/lib/trips/weather-fit";
import { isColorSeason } from "@/lib/personal/color-season";
import type { WeatherSnapshot } from "@/types/database";

export const maxDuration = 60;

const bodySchema = z.object({
  personIds: z.array(z.string()).min(1).max(FAMILY_MAX_PEOPLE),
  occasion: z.string().refine((o) => o in OCCASION_WEIGHTS),
  mode: z.enum(["coordinated", "matching", "relaxed"]).default("coordinated"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  destination: z.string().trim().max(120).nullish(),
  destLat: z.number().nullish(),
  destLon: z.number().nullish(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { user, deny } = await requireApproved(supabase);
  if (deny) return deny;

  const t = await getTranslations("family.errors");
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      {
        error: {
          code: "bad_request",
          message: issue?.path[0] === "occasion" ? t("pickOccasion") : t("checkRequest"),
        },
      },
      { status: 400 },
    );
  }
  const { personIds, mode, date, destination, destLat, destLon } = parsed.data;
  const occasion = parsed.data.occasion as Occasion;

  const session = await personSessionFor(supabase, user);
  // Every requested Person must be one this Account may see (dress, or view
  // through a linked Family).
  const people = session.viewablePeople.filter((p) => personIds.includes(p.id));
  if (people.length !== new Set(personIds).size) {
    return NextResponse.json(
      { error: { code: "person_not_found", message: t("personNotFound") } },
      { status: 404 },
    );
  }
  if (people.length === 0) {
    return NextResponse.json(
      { error: { code: "bad_request", message: t("chooseWho") } },
      { status: 400 },
    );
  }

  // Where and when: a picked place, a typed place, or home; today or a date.
  const home = session.accountProfile;
  let lat = home?.home_lat ?? null;
  let lon = home?.home_lon ?? null;
  let place = home?.home_location ?? "home";
  let weather: WeatherSnapshot | null = null;
  try {
    if (destination && destLat != null && destLon != null) {
      lat = destLat;
      lon = destLon;
      place = destination;
    } else if (destination) {
      const geo = await geocode(destination);
      if (geo) {
        lat = geo.lat;
        lon = geo.lon;
        place = locationLabel(geo);
      }
    }
    if (lat != null && lon != null) {
      const today = new Date().toISOString().slice(0, 10);
      weather =
        date && date !== today
          ? ((await getTripForecast(lat, lon, place, session.locale))[date] ?? null)
          : await getTodayWeather(lat, lon, place, session.locale);
    }
  } catch (err) {
    console.error("Family look weather failed:", err);
  }

  const contexts = people.map((p) => session.contextFor(p.id)!);
  const members: MemberInput[] = await Promise.all(
    people.map(async (p, i) => {
      const w = session.viewWardrobeFor(p.id)!;
      const [outfits, pieces] = await Promise.all([
        w.outfits({ limit: FAMILY_OUTFIT_POOL }),
        w.pieces({ confirmed: true }),
      ]);
      return {
        personId: p.id,
        audience: contexts[i].subject.audience,
        colorSeason: ((s) => (isColorSeason(s) ? s : null))(seasonOf(contexts[i].personal)),
        outfits,
        pieces,
      };
    }),
  );

  const result = coordinateFamily({
    members,
    occasion,
    mode,
    weather: { tempC: weather?.tempC ?? null, rainy: isRainy(weather?.precipProb) },
  });

  const subjects = subjectsFor(contexts.map((c) => c.source));
  const subjectById = new Map(people.map((p, i) => [p.id, subjects[i]]));
  const memberById = new Map(members.map((m) => [m.personId, m]));
  const nameById = new Map(people.map((p) => [p.id, p.display_name]));

  let notes: string[] = [];
  try {
    notes = await narrateFamilyLooks({
      occasion,
      weatherSummary: weather?.summary ?? null,
      languageRule: aiLanguageRule(session.locale),
      looks: result.looks.map((look) => ({
        members: look.picks.map(({ personId, outfitId }) => {
          const m = memberById.get(personId)!;
          const outfit = m.outfits.find((o) => o.id === outfitId)!;
          const ids = new Set(outfitPieceIds(outfit));
          return { subject: subjectById.get(personId)!, pieces: m.pieces.filter((p) => ids.has(p.id)) };
        }),
      })),
    });
  } catch (err) {
    console.error("Family look narration failed:", err);
  }

  const looks = await Promise.all(
    result.looks.map(async (look, i) => ({
      score: look.score,
      palette: look.palette,
      note: notes[i] ?? "",
      people: await Promise.all(
        look.picks.map(async ({ personId, outfitId }) => {
          const m = memberById.get(personId)!;
          const outfit = m.outfits.find((o) => o.id === outfitId)!;
          const [enriched] = await enrichCombinations(supabase, session.viewWardrobeFor(personId)!, [outfit]);
          return {
            personId,
            name: nameById.get(personId)!,
            alias: subjectById.get(personId)!.alias,
            /** Only People this Account may dress get a "Wear this" button. */
            editable: session.canEdit(personId),
            outfit: enriched,
          };
        }),
      ),
    })),
  );

  return NextResponse.json({
    occasion,
    date: date ?? new Date().toISOString().slice(0, 10),
    weather,
    looks,
    missing: result.missing.map((m) => ({ ...m, name: nameById.get(m.personId)! })),
    looseFits: result.looseFits.map((id) => nameById.get(id)!),
  });
}
