import { paletteFor } from "@/lib/personal/color-season";

/** The derived colour season with its flattering swatches. */
export function SeasonPreview({ season }: { season: string | null }) {
  const palette = paletteFor(season);
  if (!palette) {
    return (
      <p className="text-sm text-muted-foreground">
        Add your undertone, hair or eye colour and the stylist will work out which
        colours flatter you near the face.
      </p>
    );
  }
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm">
        Your colour season: <span className="font-medium text-primary">{palette.label}</span>
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Near the face, {palette.summary}.
      </p>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label={`${palette.label} colours`}>
        {palette.flatter.map((c) => (
          <li key={c.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="inline-block size-5 rounded-full border border-foreground/20"
              style={{ backgroundColor: c.hex }}
              aria-hidden
            />
            {c.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
