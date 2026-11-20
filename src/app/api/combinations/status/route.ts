import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireApproved } from "@/lib/access";
import { personSessionFor } from "@/lib/people/session";

/** Outfit-building progress across everyone this Account looks after. */
export async function GET() {
  const supabase = await createClient();
  const { user, deny } = await requireApproved(supabase);
  if (deny) return deny;

  const session = await personSessionFor(supabase, user);
  const perPerson = await Promise.all(
    session.people.map(async (p) => {
      const w = session.wardrobeFor(p.id)!;
      const [items, count] = await Promise.all([
        w.pieces({ comboStatusIn: ["queued", "generating", "failed"] }),
        w.outfitCount(),
      ]);
      return { person: p, items, count };
    }),
  );

  const items = perPerson.flatMap(({ person, items }) =>
    items.map((i) => ({
      id: i.id,
      name: i.name,
      combo_status: i.combo_status,
      person_name: person.display_name,
    })),
  );
  const building = perPerson
    .filter(({ items }) => items.some((i) => i.combo_status === "queued" || i.combo_status === "generating"))
    .map(({ person }) => person.display_name);

  return NextResponse.json({
    items,
    totalCombinations: perPerson.reduce((n, p) => n + p.count, 0),
    generating: building.length > 0,
    building,
    multiplePeople: session.people.length > 1,
  });
}
