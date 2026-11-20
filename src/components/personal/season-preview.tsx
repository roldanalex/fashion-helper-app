"use client";

import { useTranslations } from "next-intl";
import { useTaxonomy } from "@/i18n/taxonomy";
import { paletteFor } from "@/lib/personal/color-season";

/** The derived colour season with its flattering swatches. */
export function SeasonPreview({ season }: { season: string | null }) {
  const t = useTranslations("personal");
  const tx = useTaxonomy();
  const palette = paletteFor(season);
  if (!palette) {
    return <p className="text-sm text-muted-foreground">{t("seasonEmpty")}</p>;
  }
  const label = tx("colorSeason", palette.season);
  const colorName = (name: string) => {
    const key = `colors.${name.replace(/ /g, "_")}`;
    return t.has(key) ? t(key) : name;
  };
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm">
        {t.rich("yourSeason", {
          season: label,
          b: (chunks) => <span className="font-medium text-primary">{chunks}</span>,
        })}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("nearTheFace", { summary: t(`season.${palette.season}.summary`) })}
      </p>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label={t("seasonColours", { season: label })}>
        {palette.flatter.map((c) => (
          <li key={c.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="inline-block size-5 rounded-full border border-foreground/20"
              style={{ backgroundColor: c.hex }}
              aria-hidden
            />
            {colorName(c.name)}
          </li>
        ))}
      </ul>
    </div>
  );
}
