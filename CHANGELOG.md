# Changelog

All notable changes to Aether Wardrobe. Dates are release dates.

## 1.5.2 — 2026-11-21

### Added

- **Family link.** Invite the other parent, or anyone with their own Aether
  account, into your family from **Settings → Family members with an account**.
  - **Manager** can add and edit the children's clothes and plan family looks;
    **Viewer** can see them and plan looks, but not change anything.
  - The invited person accepts or declines in their own Settings, and chooses
    whether the family may see **their own wardrobe** (they can change it at
    any time).
  - The **Family** page now includes everyone you can see through a linked
    family. **Wear this** appears only for the people you dress.
  - Owners can remove members; members can leave. A family has at most 8
    members. An invitation can only be accepted by someone the admin has let
    into Aether; until then it waits.
  - Sharing your own wardrobe is off unless you turn it on, and shares your
    pieces and outfits only: your day plans (with destinations) and shopping
    suggestions stay private.
  - If you manage more than one family, **Add a person** asks which one.
- **Five languages:** English, Spanish, Brazilian Portuguese, French and
  Italian. Choose under **Settings → Language** (or on the landing page before
  signing in); the first visit follows your browser's language.
  - Every screen, button, message and clothing term is translated.
  - **The AI writes in your language too:** Today's explanations, the Stylist
    chat, Shop suggestions, family-look notes and the short note on each new
    outfit.
  - Weather descriptions come in your language.
  - **The "How it works" guide** opens in your language (`/welcome`), or
    directly at `/welcome/es`, `/welcome/pt-BR`, `/welcome/fr`, `/welcome/it`.
- **A logo.** A clothes hanger drawn as a serif "A" (the hook is the apex,
  the bar is the crossbar) with a small sparkle for the AI stylist, beside the
  wordmark in the app's own Cormorant Garamond and Jost. It replaces the text
  name in the sidebar and on the landing page, heads the "How it works" guide
  in every language, and is the new app icon and home-screen icon. Files are in
  `public/brand/`.
- **Units, one setting each.** **Settings → Units** now has temperature (°C or
  °F), weight (kg or lb) and height (cm or feet and inches) as three separate
  choices, each saved the moment you pick it.

### Changed

- The person switcher lists only the people you can dress; people you can only
  view appear on the Family page.
- Outfit generation, ranking, the stylist and the shopper are told which
  language to answer in; ids and stored values stay in English, so switching
  language never changes your data.

### Upgrade

- Run `supabase/migrations/0013_family_link_locale_units.sql` in the Supabase
  SQL Editor (after `0012`). It adds the language and unit columns, the family
  invitations and the wider viewing rules. Until it runs, the app works in
  every language but Settings cannot save the language or units and the family
  section stays empty.

## 1.5.1 — 2026-11-20

### Fixed

- **Adding a person failed** with "Could not add this person" (the server log
  said the new row violated the people table's row-level security). The read
  rule looked the person up by id, which cannot see a row while it is being
  inserted. It now checks the row's own columns. Run
  `supabase/migrations/0012_people_read_policy.sql`.
- **Weight in pounds rewrote itself while typing** (typing 3 showed 2, typing
  1 cleared the box). The box re-derived pounds from the stored whole
  kilograms on every keystroke; it now keeps exactly what you type.

### Changed

- **The "How it works" guide (`/welcome`) has a new look and content.** It
  now uses the app's espresso and brass, the app's hanger icon, and a new
  background animation: clothes rails glide along the edges and, every few
  seconds, a top, trousers and shoes come together as an outfit with its
  score. A new **Family** chapter and a **Parent** role cover dressing your
  children, and the copy leads with what each part does for you.

## 1.5.0 — 2026-11-20

### Added

- **People you dress.** Add your children, or an adult without an email,
  under **Settings → People you dress**. Each person gets their own wardrobe,
  outfit table, daily picks, stylist conversation and shopping list. They
  never sign in.
  - Name or nickname, age (adult, teen, child, toddler), styles, how dressed-up
    they like to be, fit, and optional colouring.
  - Adding a child asks you to confirm you are their parent or legal guardian.
  - **Delete** removes the person, their photos and all their outfits for good
    (it asks first).
- **Person switcher.** "Dressing: …" under the logo on a computer, and a bar
  at the top of the page on a phone. Wardrobe, Outfits, Today, Stylist and
  Shop follow your choice.
- **Family look** (new **Family** page, in the sidebar and under **More** on a
  phone). Choose who is going, the occasion, the day and the place, and how
  you want to look together: coordinated colours, one shared accent, or just
  well dressed. You get up to three looks, one outfit per person from their
  own wardrobe, with a family palette and a note on why it works. If someone
  has nothing really made for the occasion, they get their closest outfit and
  the page says so. **Wear this** puts each person's outfit first in their plan
  for that day (keeping Today's own picks after it), and counts it as worn
  only when the day is today. Today shows a shortcut when you dress more than
  one person.
- **New occasions:** **Celebration** (birthday, wedding guest, family photo)
  for everyone, and **School** for children and teens. Work is not offered for
  children.
- **Tag it myself** when adding a piece: fill in colour, type and material
  yourself and the photo is never sent to the AI. It is the default for
  children's pieces.

### Privacy for children

- Nothing about a child is sent to the AI except descriptions of their clothes:
  not their name, age, colouring or notes. The AI knows them only as
  "Child A" or "Teen B", and the app puts their name back on screen. See
  `docs/adr/0002-no-minor-personal-data-to-ai.md` for why (OpenAI's API terms
  on children's data).
- For children the app keeps only the minimum: no height, body shape, weight
  or notes. Their colouring is used only by the app's own colour rules, and
  neither their style preferences nor your home town go into prompts about
  them.
- Wherever you type for a child (a piece's description, Today's notes, the
  stylist chat), the app asks you not to include names, ages or schools.

### Changed

- Wardrobe data now belongs to a person, not an account
  (`docs/adr/0001-person-owns-wardrobe-data.md`). The database refuses any
  outfit that mixes two people's clothes, and two people can each have a plan
  for the same day and occasion.
- Outfits that include an archived piece no longer appear anywhere.
- Children's outfits are scored for comfort, ease of movement and
  durability; teens' for current, versatile looks.
- New `GLOSSARY.md` and `docs/adr/` record the project's vocabulary and its
  two hard-to-reverse decisions.

### Upgrade

- Run `supabase/migrations/0011_people.sql` in the Supabase SQL Editor (after
  `0010`). It creates families and people, gives every account its own
  person, and moves existing pieces, outfits, plans and suggestions to that
  person. No data is deleted. Until it runs, the app shows a "one database
  update to go" page instead of your wardrobe.

## 1.4.0 — 2026-11-19

### Added

- **Personal fit.** Tell the stylist about yourself and it dresses you, not
  just your wardrobe. Skin tone, undertone, hair and eye colour give your
  **colour season** (Spring, Summer, Autumn or Winter), shown with its
  flattering colours as you choose. Body shape, height, fit preference (slim,
  regular, relaxed) and a free-text note ("I prefer to cover my arms") go to the
  stylist too.
  - **Today** gives a small boost to outfits whose shirt and jacket colours suit
    your season. It only settles close calls; the occasion still decides.
  - **Stylist chat** applies the same boost when planning a trip or finding an
    outfit, and may say why a colour or cut suits you.
  - **Shop** suggests tops and jackets in your season's colours and cuts that
    suit your build.
  - Everything is optional. Onboarding's first two steps have **Skip**, tapping
    a chosen chip clears it, and **Settings → Your build and colouring** edits
    or clears it all (with **Undo**). These details could not be changed after
    onboarding before.
  - Weight is never sent to the AI. Outfit scores are not recalculated:
    personal fit reorders and explains, so changing your profile costs nothing.
- **Phone navigation.** The bottom bar now holds Today, Stylist, Wardrobe,
  Outfits and **More**; More opens Shop, Settings, Admin and the "How it works"
  guide (which phones could not reach before).
- **Undo instead of surprises.** Archive a piece, hide an outfit, dismiss or
  buy a suggestion, or clear the stylist conversation, and the confirmation
  offers **Undo**. Revoking someone's access in Admin asks first.
- **Dismissed suggestions** in Shop are listed at the bottom with **Bring
  back**. Shop says how many confirmed pieces you have until it can suggest.
- **Outfits on a phone:** filters open in a sheet from a **Filters** button,
  active filters show as chips you tap to remove, and the table loads 24 at a
  time with **Show more outfits**.
- **Install to home screen.** A web app manifest and Apple web-app settings let
  Aether open full screen from the home screen.
- Pages for "not found" and for errors outside the app, in the app's voice,
  with a reference code to quote.
- Onboarding keeps your answers if the page reloads, and both onboarding and
  Settings use the city autocomplete for your home location.

### Changed

- Buttons, inputs, selects, chips and the tab bar are at least 44px tall on
  touch screens; desktop keeps its compact sizes.
- The bottom bar, the stylist composer and sheets respect the iPhone home
  indicator and notch (`viewport-fit=cover` was missing, so safe-area padding
  never applied).
- Input, select and chip outlines are stronger (3:1 contrast against the
  background), every control shows a visible brass focus ring, and the
  smallest text is now 12px.
- **Style my day** sits above the tab bar on phones, results show placeholders
  while they load, and the page scrolls to the picks when they arrive.
- The landing page's 3D thread runs only on desktop screens with a mouse, and
  pauses when off-screen or in a background tab; phones get the static
  gradient and skip the 3D download.
- Upload sheet: fits short phones, with the **Upload & analyze** button always
  visible.
- Information that only appeared on mouse hover (optional readiness chips,
  piece names, "worn in N outfits") is now visible or read by screen readers.
- Screen readers: the stylist's finished reply is announced once, its headings
  are real headings, sliders and the location field are properly labelled, the
  wizard moves focus to each new step, and collapsed wardrobe sections stay
  linked to their toggles.
- Toasts always use the dark theme; dialog and sheet backdrops are darker.
- The `/welcome` guide opens in brass instead of flashing red, and has a proper
  title.
- The outfit-building banner appears as soon as you confirm a piece and stops
  polling if the status check fails.

### Fixed

- Shop failed to load the formality preference for admins (the profile query
  could return several rows).

### Upgrade

- Run `supabase/migrations/0010_personal_fit.sql` in the Supabase SQL Editor.
  It adds `fit_preference` and `style_notes` and constrains `color_season`.
  Run it before deploying: until it runs, saving build and colouring in
  Settings fails, and so does finishing onboarding for a new user.

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
