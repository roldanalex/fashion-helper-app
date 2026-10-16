# Changelog

All notable changes to Aether Wardrobe. Dates are release dates.

## 1.2.0 — 2026-10-16

### Added

- **Watches are their own wardrobe category.** Add a watch under **Watch**
  instead of **Accessory**. Its type is the watch style (dress, sports, diver,
  GMT / travel, chronograph, field, pilot), and it keeps the band and hardware
  tone chips.
- **A watch slot in every outfit.** Combinations gain an optional watch,
  next to the optional outerwear. A new watch is placed in every outfit it
  suits; other new pieces get the best-fitting watch you own (closest
  formality, then highest old-money fit). Belts and other accessories follow
  the watch's metal.
- **Daily watch choice.** The ranking call receives a separate watch pool and
  picks the day's watch per outfit, alongside the accessories. The choice is
  saved with the plan, shown on the card and counted when you mark the outfit
  worn.
- **"Any watch" filter** on the Outfits tab, and a **Watch** chip in the
  readiness banner.
- **Shopping** analyses watches as their own category, with its own unlock
  count and suggestions.

### Changed

- Accessories no longer include watches; their types are belt, man bag,
  scarf, sunglasses, pocket square and hat.
- The scoring and tagging prompts describe the watch as its own slot.
- The Outfits completeness order counts the watch as one more piece.

### Database

- Migration `0009_watches.sql`: allows the `watch` category, adds
  `combinations.watch_id`, moves existing watch accessories into the new
  category (their watch style becomes the type, defaulting to *sports* when
  none was set), moves watch ids out of `accessory_ids` into `watch_id`, and
  rebuilds the uniqueness index to include the watch slot. No rows are
  deleted.

## 1.1.0 — 2026-10-11

### Added

- **Accessory details.** Watches carry a style (dress, sports, diver, GMT /
  travel, chronograph, field, pilot), a band (metal bracelet, leather, rubber,
  fabric / NATO) and a hardware tone (silver, gold, rose gold, two-tone).
  Belts, sunglasses and man bags carry a hardware tone. The tag editor shows
  these as extra chip rows for the matching type; the vision tagger fills them
  in and names the brand and model when legible.
- **New materials** for accessories: steel, gold, titanium, rubber, nylon,
  acetate.
- **Two occasions**, available on both the Today chips and the Outfits
  filter: *Indoors / Conferences* and *Lunch*, each with its own score blend
  and a stylist hint (indoors: weather matters only for the commute).
- **More daily picks.** Style my day returns five to seven ranked outfits
  (previously three to five), chosen from a pool of sixteen candidates.
- **Daily accessory choice.** The ranking call sees every confirmed accessory
  and chooses the day's watch, belt or sunglasses per outfit: GMT for travel,
  dressier watch for work or dinner, metals kept consistent. The choice is
  saved with the plan, shown on the card and recorded when you mark the outfit
  as worn.
- **Outfits filters by outerwear and accessory.** "Any outerwear → …" and
  "Any accessory → …" sit next to the existing top, bottom and shoes filters.
- **Outfits ordered by completeness.** After boosted looks, outfits with all
  five slots filled come first, then those missing a layer, then bare
  three-piece looks; score orders within each group.
- **Readiness banner** shows Outerwear and Accessories as optional chips next
  to the three required slots.
- **Onboarding site** at `/welcome`: a value deck plus a step-by-step guide
  with checkpoints, light and dark themes, deep links and print-to-PDF. Linked
  from the landing page and the app sidebar.
- **User guide** at `docs/USER-GUIDE.md` and this changelog.
- **Continuous integration.** A GitHub Actions workflow type-checks, runs
  the Vitest unit suite (candidate engine, accessory picking, readiness, gap
  analysis, occasion weights, schemas, prompt descriptors), builds for
  production without secrets, and scans the full git history with gitleaks.
- **Architecture diagram** in `docs/diagrams/` (draw.io source and PNG).

### Changed

- The candidate engine prefers accessories whose hardware tone matches the
  first metal piece chosen, and still never pairs two of the same type.
- The scoring prompt weighs accessories: watch formality against the outfit,
  metal consistency.
- The item descriptor used by every text prompt includes accessory details,
  so scoring, ranking and shopping all see "gmt watch, bracelet band, silver
  hardware".
- Accessory ids in a combination are stored sorted, so the same set never
  creates two rows.

### Fixed

- **A second accessory of the same kind never entered any outfit.** The
  combinations uniqueness index covered only top, bottom, shoes and outerwear,
  so a new watch's candidates collided with existing rows and Postgres
  rejected the whole insert batch. Migration `0008` rebuilds the index to
  include the accessory set, and inserts now retry row by row when a batch
  hits a duplicate instead of discarding the batch.

### Database

- Migration `0008_accessories.sql`: adds `clothing_items.attributes jsonb`,
  rebuilds `combinations_unique_tuple_idx` to include `accessory_ids`, adds a
  GIN index on `accessory_ids`. Run it in the Supabase SQL editor after
  deploying.

## 1.0.0 — 2026-08-20

Initial release: profile wizard, wardrobe cataloguing with GPT-4o vision
tagging, deterministic combination engine with gpt-4o-mini batch scoring,
daily recommendations with destination weather, wear tracking, outfits
browser, shopping gap analysis, admin allowlist.
