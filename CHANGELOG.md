# Changelog

All notable changes to Aether Wardrobe. Dates are release dates.

## 1.3.1 — 2026-10-27

### Added

- **Celsius or Fahrenheit.** A two-way °C / °F switch on the weather line on
  Today, and the same control under **Settings → Temperature**. The choice
  saves to your profile the moment you pick it and applies everywhere a
  temperature shows: Today, the trip manifest card, the outfit options card
  and the stylist's replies. Onboarding now guesses °F for a home in the
  United States and its territories, °C elsewhere.

### Changed

- Forecasts are still fetched and scored in °C; only the display converts, so
  season bands and rain rules are unchanged.

## 1.3.0 — 2026-10-26

### Added

- **Stylist tab: pack for a trip in one conversation.** A new **Stylist**
  tab opens a chat with your personal stylist. Say where you are going, for
  how long and what the days hold ("work Thursday and Friday, dinner Friday,
  sightseeing Saturday") and it lays out one outfit per day and occasion,
  chosen from your own Outfits table so that pieces repeat across the trip
  and the suitcase stays small. Ask for tweaks in plain words: one pair of
  shoes, drop the blazer, carry-on only, add a dinner.
- **Trip manifest card.** Every plan arrives as a card: the forecast per
  day, each day's outfits with colour swatches linking to the pieces, and a
  packing list grouped by category with how many times each piece is worn.
  **Copy list** puts a tick-box packing list on the clipboard.
- **Deterministic packing optimizer.** The stylist does not invent outfits.
  A pure TypeScript planner filters the table by each day's season band and
  rain, by the occasion blend, and by your constraints (shoe and outerwear
  limits, pieces to exclude or insist on), then chooses outfits that share
  pieces, avoids the identical look two days running, and reports honestly
  when nothing suits a day. One gpt-4o-mini call narrates the result.
- **Ask for one outfit, built around your pieces.** "What goes with my
  navy blazer for dinner on Friday? I'd like to wear the brown loafers."
  A second tool, `find_outfits`, returns the table's best outfits for one
  occasion that contain every piece you named, filtered by the forecast
  when you give a place and date. The card shows each outfit with swatches
  and scores; the stylist adds the eye: why the colours sit together, where
  the formality lands, what to swap to dress it up or down.
- **Named pieces are honoured, not hinted.** On a trip, "use the blazer on
  Friday" builds every Friday outfit around it when the table allows, and
  "I want to take the GMT" guarantees it is worn at least once. Several
  pieces named for one day are spread across that day's outfits (the loafers
  at the conference, the drivers at dinner). When a piece cannot be worn on
  a day (wrong season, never scored with the rest) the card says so once,
  per day, instead of quietly leaving it out.
- **Day-by-day forecast.** The weather service's five-day outlook is read
  per local day at the destination. Beyond five days the stylist estimates
  the climate and the card says so.
- The stylist's replies render headings, bullets, bold and numbered lists
  properly, and are asked to stay in short prose after a plan rather than
  restating the card.
- The conversation is kept on the device per account, so switching tabs or
  reloading does not lose the plan. **Start over** clears it.

### Changed

- The mobile tab bar has six tabs (seven for admins).
- **Free-text destinations are more forgiving.** "San Francisco, CA" used
  to match nothing because the geocoder read "CA" as Canada. Geocoding now
  tries the US-state reading and then the city alone, for the stylist and
  for the Today tab's typed destination alike.
- The daily "Style my day" flow is unchanged; the season-band helper it
  shares with the planner moved to `src/lib/weather-bands.ts`.

### Models

- The Stylist chat runs on **gpt-5.5** with low reasoning effort; batch
  scoring, daily ranking and shopping stay on gpt-4o-mini. Optional
  `STYLIST_MODEL` environment variable overrides the chat model (for
  example `gpt-5.4-mini`).

### Dependencies

- `@ai-sdk/react` for the streaming chat hook. No required new environment
  variables and no database migration.

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
