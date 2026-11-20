# Aether Wardrobe — User Guide

Version 1.5.2 · November 2026

This guide follows the order you will use the app: sign in, set up your
profile, add pieces, review tags, browse the Outfits table, ask for today's
outfit, pack for a trip with the stylist, shop with intention, and dress the
whole family together. The same content, with progress checkpoints,
is available in the app at `/welcome`.

## 1. Before you start

- **Finding your way.** On a computer every section is in the left sidebar. On
  a phone the bar at the bottom holds **Today**, **Stylist**, **Wardrobe** and
  **Outfits**; **More** opens Family, Shop, Settings, Admin (for admins) and
  this guide.
- **Language.** Aether speaks English, Spanish, Brazilian Portuguese, French
  and Italian. Your first visit follows your browser; change it any time under
  **Settings → Language** (or on the landing page before you sign in). The AI's
  explanations, the Stylist chat and this guide follow the same choice.
- **Add it to your home screen.** In Safari or Chrome, use *Share → Add to
  Home Screen* (or *Install app*). Aether then opens full screen like an app.

- **Access is by invitation.** Sign in with the Google account whose email was
  granted access. If you land on an "awaiting invitation" page, ask the person
  who invited you.
- **Minimum wardrobe.** Outfits appear once you have confirmed at least one
  top, one bottom and one pair of shoes. Five to ten pieces make it
  interesting.
- **Only confirmed pieces count.** A piece still marked "Review tags" is not in
  any outfit.
- The readiness banner on Wardrobe and Today shows the three required slots
  with a check or cross, and Outerwear, Watch and Accessories as optional, dashed
  chips: outfits work without them, but they are what make a look complete.

## 2. Sign in and set up your profile

The four-step wizard personalises every later suggestion. All of it can be
changed later under **Settings**. Your answers are kept if you reload the page
part-way through.

1. **About you** (optional): gender, age range, height and weight (in cm and
   kg, or ft and lb: pick at the top of the step), body shape, and how you like
   clothes to fit (slim, regular or relaxed).
2. **Your colouring** (optional): skin tone, undertone, hair and eye colour.
   As you choose, the step shows your **colour season** (Spring, Summer,
   Autumn or Winter) with the colours that flatter you near the face. Not sure
   of your undertone? Warm if your veins look greener and gold suits you, cool
   if they look bluer and silver suits you, neutral if both or you can't tell.
3. **Your style**: one or more styles (Old Money, Classic, Smart Casual,
   Minimalist, Sporty, Streetwear), your usual formality from 1 to 10, your
   lifestyle, and an optional note for the stylist ("I prefer to cover my
   arms", "no skinny jeans").
4. **Home base**: start typing and pick from the list. This is the weather
   fallback whenever you do not name a destination. It also sets your first
   temperature unit: °F for a home in the United States, °C elsewhere.

Steps 1 and 2 have a **Skip** button. Tapping a chosen chip again clears it, so
you can answer some questions and leave others.

### How your build and colouring are used

- **Today** gives a small boost to outfits whose shirt and jacket colours suit
  your colour season. It only reorders close calls: an outfit that clearly
  suits the occasion better still wins.
- **The Stylist chat** applies the same boost when it plans a trip or finds an
  outfit, and may say why a colour or cut suits you.
- **Shop** suggests tops and jackets in your season's colours, and cuts that
  suit your build and fit preference.
- Your weight is never sent to the AI; body shape says what the stylist needs.
  The rest is sent to OpenAI only to rank and explain your outfits, and is
  never shown to anyone else.
- The scores in your Outfits table do not change. They describe how the pieces
  work together, which does not depend on who wears them.

Edit or clear any of it under **Settings → Your build and colouring**;
**Clear all** removes every answer at once (with an **Undo**).

## 3. Build your wardrobe

### Add a piece

1. On **Wardrobe**, tap **Add piece**. On a phone you can take the photo with
   the camera; on desktop, choose a file.
2. Pick the **category**: top, bottom, outerwear, shoes, watch or accessory. This is
   the one tag the AI will not override.
3. **Describe what the photo cannot show.** Optional but valuable: "pique
   cotton", "merino", "Tudor Black Bay GMT on steel bracelet". Your words are
   treated as ground truth, especially for material.
4. **Tag it myself** (optional). Switch it on to fill in colour, type and
   material yourself; the photo is then never sent to the AI. It is on by
   default for a child's pieces.
5. Submit. The photo is compressed in your browser, stored privately, analysed
   (unless you tag it yourself), and you are taken to the piece's page.

### Review the tags

Every piece lands in "Review tags" first. Check and correct, then confirm.

| Tag | What to check |
| --- | --- |
| Name and colour | The swatch should match the dominant colour. For a watch, the dial colour. |
| Type | Depends on the category: polo, chinos, loafers, belt… For a watch, the type is its style. |
| Material | Includes steel, gold, titanium, rubber, nylon and acetate for watches and accessories. |
| Pattern | Solid, striped, plaid, check, herringbone, houndstooth, cable-knit, floral, printed. |
| Seasons | Every season the piece comfortably suits. |
| Formality | 1 gym wear · 5 smart casual · 8 business · 10 black tie. |
| Old money fit | Timeless cuts, natural fabrics, muted colours, no loud logos. |

**Confirm tags** starts outfit generation in the background; the app-wide
banner shows progress and you can keep adding pieces. **Re-analyze** asks the
vision model again (useful after adding a description). **Archive** removes
the piece from every outfit without deleting the photo; the confirmation has an
**Undo** that puts it straight back. Saving changes on an
already confirmed piece rebuilds its outfits.

### Watches

Watches are their own category. Pick **Watch** when you add one.

| Chip row | Options |
| --- | --- |
| **Watch style** (the type) | Dress, sports, diver, GMT / travel, chronograph, field, pilot |
| **Band** | Metal bracelet, leather strap, rubber strap, fabric / NATO |
| **Hardware tone** | Silver, gold, rose gold, two-tone |

Every outfit has an optional watch slot, like outerwear. A new watch goes into
every outfit it suits. Any other new piece gets the watch you own that best
matches the outfit's formality, with old-money fit breaking ties. On the Today
tab the stylist can swap in a different watch for the day.

### Accessories

Belts, man bags, scarves, sunglasses, pocket squares and hats. Metal-bearing
types carry one extra chip, which the engine matches to the outfit's watch.

| Type | Extra chip |
| --- | --- |
| Belt | **Buckle tone** |
| Sunglasses | **Frame tone** |
| Man bag | **Hardware tone** |

How the stylist reads a watch:

- A dress watch on leather rates formality 8 to 9 and old money 9 to 10.
- A classic steel sports watch (Carrera, Black Bay, Datejust, Aqua Terra) rates
  formality 6 to 7 and old money 7 to 8. A coloured bezel or rubber strap takes
  a point off.
- GMT and sports watches go to travel and active days; dress watches to work,
  dinner and events.
- The engine prefers a belt buckle that matches the watch's hardware tone.
  An outfit only ever has one watch.

Example tags:

| Piece | Material | Style | Band | Tone | Formality | Old money |
| --- | --- | --- | --- | --- | --- | --- |
| Tudor Black Bay GMT, black dial, red/blue bezel | steel | gmt | bracelet | silver | 6 | 7 |
| TAG Heuer Carrera Twin-Time, blue dial | steel | sports | bracelet | silver | 7 | 8 |

Each new watch or accessory creates its own variants of the outfits it suits,
so the Outfits table can show the same shirt and chinos once with each watch.

**Upgrading from 1.1:** watches you added as accessories move to the Watches
category automatically. Their style comes from the old watch-style chip, or
*sports* if none was set; open each watch to check it.

## 4. The Outfits table

Every combination that scored 7.0 or better, best first. The Today tab draws
from this pool, so curating it here improves every morning.

- **Order.** Boosted outfits first, then the most complete ones (top, bottom,
  shoes, outerwear, watch and accessories all present), then those missing a layer,
  then the bare three-piece looks; within each group, by score.
- **Build around a piece.** The first dropdowns filter to one top, one bottom,
  one pair of shoes, one piece of outerwear, one watch or one accessory.
  "Any watch → Tudor GMT" shows every outfit that works with that watch.
- **Occasion, season, score.** Occasion re-sorts by a blend of work, daily,
  formality and old-money scores. Score 7+, 8+ or 9+ sets the floor.
- **Boost or hide.** The star boosts an outfit to the top of every daily
  request; the eye hides it, with an **Undo** on the confirmation. **Show
  hidden** reveals what you put away.
- **On a phone** the filters live behind a **Filters** button that opens a
  sheet; the filters you set show as chips above the results, and tapping a
  chip removes that filter.
- The table shows 24 outfits at a time; **Show more outfits** loads the next 24.
- **Resting** means the outfit was recommended or worn in the last seven days.
- The one-sentence stylist note is reused to explain the pick on Today.

## 5. Today

### Style my day

1. **What does today hold?** Pick one occasion chip (see the table below).
2. **Where? (optional)** Start typing a city and pick it; the forecast there is
   used. Leave it blank and your home city fills in.
3. **Anything else? (optional)** Free text the stylist reads: "client meeting,
   then lunch with the kids", "all-day conference, long walk after".
4. Tap **Style my day** (on a phone it sits just above the tab bar). You get
   five to seven ranked outfits, and the page scrolls to them. Each card shows
   the pieces, including the watch and belt chosen for today, the score, and
   two sentences on why it suits the day. **Fresh suggestions** asks again.

The weather line above the outfits ends in a small **°C / °F** switch. Tap
the unit you read, and every temperature in the app follows, including trip
plans and the stylist's replies. The same choice lives under **Settings →
Temperature**.

Behind the button: the forecast at the destination is fetched (suede and
canvas shoes are dropped on rainy days), the table is filtered by season and
sorted by the occasion blend (plus the small colour-season boost, if you shared
your colouring) with boosted and fresh outfits first, and one AI call ranks the
picks and selects the watch and accessories from everything you own. The
plan is saved per day and occasion, so reloading costs nothing.

### Choosing the occasion

| Occasion | What the stylist is told |
| --- | --- |
| Work | Office or client-facing; polished, business casual or above. |
| Indoors / Conferences | Climate-controlled all day. Weather matters only for the commute; layers that come off indoors, comfort for long hours. |
| Lunch | Daytime, relaxed but put-together, a nod to old-money fit. |
| Mall / Shopping | Walking; comfortable shoes, easy layers. |
| Park / Outdoors | Outdoors and on the move; weather first. |
| Going Out | An evening out; presence and polish. |
| Dinner | Sit-down; elevated, considered, never stiff. |
| Errands | Quick stops; practical and unfussy. |
| At Home | Comfort with a little intention. |
| Travel | Comfortable in transit, presentable on arrival; a GMT or travel watch and easy layers. Type the destination so the forecast is the one you land in. |

### Wear it and keep it fresh

Tap **I'll wear this** on the outfit you chose. Every piece in it, including
the day's accessories, updates its wear count and last-worn date, and the
outfit rests for seven days. Each occasion has its own plan for the day:
switching from Work to Dinner asks fresh.

## 6. Stylist: pack for a trip

The **Stylist** tab is a conversation with your personal stylist. Its
specialty is trips of two days or more, where the question is not "what do I
wear" but "what do I pack so that every day works and the bag stays small".

### Ask for a plan

Say three things, in your own words:

1. **Where.** A city, with the country if the name is ambiguous.
2. **When.** Dates, or "this weekend", "Thursday to Sunday", "next month from
   the 12th to the 16th".
3. **What the days hold.** "Work Thursday and Friday, dinner on Friday,
   sightseeing Saturday." One outfit is planned per occasion you mention, so
   a work day with a dinner gets two.

Constraints are welcome in the same sentence: "carry-on only", "one pair of
shoes", "no blazer", "I want to take the Tudor GMT".

The stylist asks one question if the destination or dates are missing, then
lays out the trip. Three example requests are shown when the conversation is
empty; tap one to put it in the box and change the city and dates.

### Read the manifest

Every plan arrives as a card:

| Part | What it shows |
| --- | --- |
| Header | Destination, dates, and the totals: pieces packed, outfits, pairs of shoes, outerwear, watches. |
| Day by day | The forecast for each day (temperature, range, rain chance), then one row per occasion with the outfit's pieces as colour swatches. Each piece links to its wardrobe page. **loose fit** marks an outfit chosen below the usual score floor. |
| What to pack | The packing list grouped by category. **×3** next to a piece means it appears in three of the trip's outfits. **Copy list** puts a tick-box version on the clipboard. |
| Caveats | Honest notes: days planned from an estimated temperature, days that had no suitable outfit, a shoe limit that had to be relaxed. |

Below the card the stylist writes a few sentences: which pieces carry the
trip, the weather caveat, and tweaks you might like.

### Name the pieces you want

Mention them in the request and they become part of the plan:

- "Use the navy blazer on Friday" builds every Friday outfit around it.
- "I want to take the Tudor GMT" guarantees it is worn at least once.
- "No suede drivers" keeps a piece out altogether.

Pieces are matched by name, colour, type or brand as you tagged them. If two
pieces could match ("the blue shirt"), the stylist asks which. When a named
piece cannot be worn on a day (wrong season for the forecast, or never scored
with the rest), the card's caveats say so; the stylist will not claim it was
used when it was not.

### Ask for one outfit

The stylist also answers single-occasion questions from the same table:
"What goes with my navy blazer for dinner on Friday? I'd like to wear the
brown loafers." Name the occasion, the pieces you want, and optionally where
and when for the forecast. You get a card with up to five outfits that
contain every piece you named, each with its score and stylist note, and a
few sentences of insight: why the colours sit together, where the formality
lands, how the watch and belt metals agree, and what to swap to dress it up
or down. An empty card means those pieces have never been scored together;
ask with fewer pieces, or let Shop name what is missing.

### Refine it

Reply in plain words and a new card arrives:

- "Do it with one pair of shoes."
- "Drop the suede drivers."
- "Add a dinner on Saturday."
- "Make it carry-on only."
- "Swap Friday's work outfit for something with the navy blazer."
- "Show me three options for Saturday's dinner with the loafers."

### How the plan is made

The stylist does not compose outfits. Your words are turned into a
structured request (destination, dates, occasions per day, constraints) and
a deterministic planner answers it from the Outfits table:

- The forecast is read per day at the destination. The free forecast
  reaches five days ahead; for later days the stylist estimates the typical
  temperature and the card says *estimate*.
- For each day and occasion, outfits are filtered by season band and rain
  (no suede or canvas shoes on wet days) and by the occasion blend, exactly
  as on the Today tab.
- Across the trip, the planner prefers outfits that share pieces, so one pair
  of loafers and one watch can serve the whole trip, and avoids the identical
  outfit two days running.
- Shoe and outerwear limits are kept unless a day would otherwise have
  nothing to wear; the card says when a limit was relaxed.

The conversation stays on your device, per account, until you tap **Start
over** (which offers **Undo** for a few seconds). Nothing in a trip plan changes your table or your wear counts; mark
outfits as worn from the Today tab as usual.

## 7. Shop: what to buy next

Tick the categories you are shopping for. For each, the app counts how many
new outfits one good neutral piece would unlock against your actual wardrobe
and names the bottleneck category. Suggestions are concrete ("Navy hopsack
blazer") and say which of your pieces they would pair with. If you shared your
build and colouring, colours and cuts follow them. Save, dismiss or mark
purchased; a purchased suggestion is a reminder to photograph and add the real
piece. **Not for me** and **I bought it** both offer **Undo**, and dismissed
suggestions stay in a **Dismissed suggestions** list at the bottom where
**Bring back** restores them. Shop needs at least three confirmed pieces; until
then the page says how many you have.

## 8. Dressing your family

### Add the people you dress

Under **Settings → People you dress**, tap **Add a person**. Use it for your
children, or for an adult who has no email (a grandparent, say). They never
sign in; you look after their wardrobe.

- **Name or nickname**: shown only to you.
- **Age**: adult, teen (13–17), child (4–12) or toddler (0–3). Children and
  teens get **School** as an occasion instead of **Work**, and their outfits
  are judged for comfort, ease of movement and durability.
- **Parent or guardian**: for anyone under 18 you confirm you are their parent
  or legal guardian.
- **Styles, how dressed-up, fit**: as for you.
- **Colouring** (optional): gives their colour season. For a child it is used
  only by the app's own colour rules and is never sent to the AI.

A family can have up to eight people, you included. **Edit** changes any of
this; **Delete** removes the person, all their pieces, photos, outfits and
plans for good, after asking.

### Switch who you are dressing

Once you have added someone, **Dressing: …** appears under the logo on a
computer and as a bar at the top of the page on a phone. Pick a person and
Wardrobe, Outfits, Today, Stylist and Shop all switch to them: their pieces,
their outfit table, their day, their stylist conversation, their shopping
list. **Add piece** adds to the person you are dressing. Outfits never mix
two people's clothes.

### Plan a family look

Open **Family** (sidebar, or **More** on a phone; Today also shows a shortcut).

1. Tick **who is going**. Someone without outfits yet is marked.
2. Pick the **occasion**. **Celebration** covers birthdays, weddings as guests
   and family photos.
3. Choose **how to look together**: **Coordinated colours** (a shared
   palette), **One shared accent** (one colour picked up by everyone) or
   **Just dress well** (everyone's best, lightly matched).
4. Optionally set the **day** and the **place**; the forecast there is used.
5. Tap **Plan our look**. You get up to three looks: one outfit per person
   from their own table, a strip with the family's palette and a note on why
   it works. Parents stay at a similar level of dress; children are given
   more leeway.
6. **Wear this** under a person puts that outfit first in their plan for the
   day and occasion (any picks Today already made stay after it). For today it
   also counts as worn; for a later day it is saved as the plan only.

If someone has no outfits, or nothing for that weather, the page says so and
dresses everyone else. If nothing in someone's wardrobe is really made for the
occasion, they get their closest outfit and the page says so.

### Link another parent or family member

Someone who has their own Aether account (the other parent, a grandparent)
can join your family under **Settings → Family members with an account**:

1. Type their email and choose what they can do. **Manage** lets them add and
   edit the children's clothes and plan family looks. **View only** lets them
   see the outfits and plan looks without changing anything.
2. Tap **Send invitation**. If they don't have access to Aether yet, the
   invitation waits until the admin lets them in.
3. They open **Settings** on their own account, see the invitation, choose
   whether your family may see **their own wardrobe**, and tap **Join family**.

Sharing your own wardrobe is off unless you turn it on, and it shares your
pieces and outfits only; your day plans and shopping suggestions stay private.
Each member can change it at any time. The owner can remove a member; a member can **Leave this family**.
People you can only view appear on the **Family** page but not in the
**Dressing** switcher, and only the people you dress get **Wear this**.

### Children's privacy

- Children never sign in and have no email.
- Nothing about a child is sent to the AI except descriptions of their
  clothes. The stylist knows them only as "Child A" or "Teen B"; the app puts
  their name back on screen. Please don't type a child's name, age or school
  into the stylist chat.
- For children the app keeps only the minimum: no height, body shape, weight
  or notes.
- Photograph a child's pieces on their own: no one wearing them and no name
  labels in view.

## 9. Photos that tag well

- One piece, flat, filling the frame, in daylight. No people or other clothes
  in shot.
- Shoot near a window; warm lamps turn navy into black.
- Say what the camera cannot see: material, brand and model for watches,
  anything unusual about the cut.
- Watches: dial facing up, bracelet straight, so the bezel, dial and band are
  readable.

## 10. When something looks off

| Symptom | What to do |
| --- | --- |
| No outfits yet | You need a confirmed top, bottom and shoes; the readiness banner lists what is missing. If pieces are confirmed but the table is empty, use **Build outfits** on Wardrobe; it fills in only what is missing. |
| I archived a piece by mistake | Tap **Undo** on the confirmation. If it has gone, ask the admin to set `archived` back to false on the piece. |
| I cleared the stylist conversation by mistake | Tap **Undo** on the "Conversation cleared" confirmation. |
| Saving build and colouring fails, or onboarding will not finish | The database update for 1.4.0 (migration `0010`) has not been run yet; ask whoever runs the app. |
| "Nothing quite fits this day" | Nothing scored 6.5 or better for this season and occasion. Try another occasion, relax the score filter on Outfits, or let Shop tell you which piece would unlock the most. |
| Wrong tags | Open the piece, fix the chips, **Save changes**. For a stubborn material or watch style, add a description and **Re-analyze**. |
| The stylist cannot place a destination | Add the country: "Porto, Portugal". |
| Temperatures, weight or height are in the wrong unit | Each has its own setting under **Settings → Units**: temperature (°C or °F; also on the weather line on Today), weight (kg or lb) and height (cm or feet and inches). The forecast itself is always fetched in °C and converted on screen. |
| A trip day says "Nothing in your table suits this" | No visible outfit passes that day's season band, rain rule and occasion. Ask the stylist to relax the occasion ("errands instead of work"), or let Shop name the missing piece. |
| Settings won't save the language or units, or the family section is empty | The 1.5.2 database update (migration `0013`) has not been run yet; ask whoever runs the app. |
| The app shows the wrong language on a new phone | The language is remembered per device. Choose it once under **Settings → Language**. |
| "One database update to go" | The database update for 1.5.0 (migration `0011`) has not been run yet; ask whoever runs the app. Nothing has been lost. |
| "Could not add this person" | The 1.5.1 database fix (migration `0012`) has not been run yet; ask whoever runs the app. |
| I can't see the person switcher | It appears once you have added someone under **Settings → People you dress**. |
| Family says someone "has no outfits yet" | Switch to that person and confirm at least a top, a bottom and shoes for them; their outfits then build. |
| It feels slow | Confirming a piece scores up to 120 candidates in batches and can take a minute or two on a large wardrobe; the banner shows progress. Today waits on the weather service and one model call, usually a few seconds. |

## Privacy

Photos live in a private storage bucket served through short-lived links.
Every table is protected by row-level security, so you only ever see your own
rows, and the people you dress. Build and colouring are optional; weight is never sent to the AI, and the
rest is sent to OpenAI only to rank and explain your own outfits. AI calls run server-side; your images are sent to the vision model only
for tagging (never when you choose **Tag it myself**), never for scoring or
daily ranking. Nothing about a child is sent to the AI except descriptions of
their clothes.
