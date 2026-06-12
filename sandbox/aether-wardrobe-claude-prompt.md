# Claude Code Prompt: Aether Wardrobe

**Copy everything below this line and paste it into Claude Code.**

---

You are an expert full-stack developer specializing in AI-powered web applications. Build a production-grade fashion recommendation web application called **Aether Wardrobe**.

## Project Vision

Aether Wardrobe is a personal AI stylist that analyzes a user’s physical profile and entire wardrobe (via photo uploads) to generate a structured **Combination Compatibility Table**.

Users can also input their plans for the day (activities, destination, reason/purpose, whether kids are involved, etc.). The AI then intelligently queries the Combination Table using weather at the destination + the user’s daily plans to suggest the most suitable outfit combinations. The app must strongly support an “Old Money” aesthetic while remaining flexible for general use.

The system must be **data-driven, transparent, and reliable** rather than purely generative.

## Tech Stack (Vercel-First)

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (Postgres + pgvector) **or** Vercel Postgres + Drizzle ORM
- **Auth**: Supabase Auth or Clerk
- **Image Storage**: Supabase Storage or Vercel Blob
- **AI**: Anthropic Claude 3.5 Sonnet (preferred) or GPT-4o via Vercel AI SDK
- **Weather**: OpenWeatherMap or WeatherAPI.com
- **Hosting**: Vercel
- **State Management**: TanStack Query + Zustand
- **Validation**: Zod + React Hook Form

## Core Data Models

### 1. User Profile
- `id`, `gender`, `age_range`, `height_cm`, `weight_kg`, `body_shape`, `skin_tone`, `skin_undertone`, `hair_color`, `eye_color`, `preferred_formality`, `lifestyle_tags[]`, `color_season`, `created_at`

### 2. Clothing Item
- `id`, `user_id`, `name`, `category`, `subcategory`, `color_name`, `color_hex`, `pattern`, `material`, `season[]`, `formality_level` (1-10), `old_money_score` (1-10), `image_url`, `embedding` (vector), `last_worn`, `wear_count`, `purchase_price`, `created_at`

### 3. Combination Table (Most Important)

Create a dedicated table called `combinations`:

```sql
id
user_id
top_id
bottom_id
outerwear_id (nullable)
shoes_id
accessory_ids[] (array)
color_harmony_score (0-10)
old_money_score (0-10)
formality_score (0-10)
weather_suitability_score (0-10)
work_score (0-10)
daily_score (0-10)
overall_score (0-10)
season_suitability text[]
notes text
created_at
last_recommended
```

**Rule**: Only store combinations with `overall_score ≥ 7.0`.

## Key Features (Phased)

### Phase 1 (Core Foundation)
- Detailed user profile onboarding
- Wardrobe photo upload with AI auto-tagging
- Automatic Combination Table generation (incremental)
- Daily Work + Daily recommendations

### Phase 2
- Weather-integrated recommendations (including destination weather)
- Daily planning input (activities, destination, kids, purpose) to influence recommendations
- Strong Old Money scoring and mode
- “Build around this item” feature
- Wear tracking + freshness logic

### Phase 3 (Future)
- Trip planner with packing lists
- Conversational AI stylist
- Analytics dashboard (cost-per-wear, style distribution, etc.)

## AI Strategy & Prompt Engineering

Implement **two distinct AI layers**:

**Layer 1 – Combination Table Builder**  
When new items are uploaded:
- Use vision to analyze each item
- Compare against existing wardrobe
- Generate high-quality combinations using **structured JSON output**
- Store results in the `combinations` table

**Layer 2 – Daily Recommendation Engine**  
- Accept user input about their plans for the day (activities, destination, kids, purpose/reason)
- Query the `combinations` table using weather at the destination + daily plans
- Apply weather, calendar, recency, and context-specific filters
- Use LLM only for final ranking and natural language explanations

**Daily Planning Input**  
Users should be able to describe their day (e.g., “Client meeting in the city + lunch with kids”, “Traveling to Rome for a conference”, “Work from home + school run”). The recommendation engine must factor this context when selecting combinations.

## Weather Integration

- Integrate OpenWeatherMap (or WeatherAPI)
- Fetch current weather + forecast for both home location and destination (when provided)
- Map conditions to `weather_suitability_score`
- Support temperature, precipitation, and humidity

## UI/UX Requirements

- Clean, minimalist, luxurious interface
- Dark mode by default with elegant typography
- Mobile-first responsive design
- Clear “Why this outfit?” explanations
- Ability to view and manually boost/hide combinations
- Professional and calm visual language (especially for Old Money recommendations)
- Simple input field for “What are you doing today?” with optional destination and notes (kids, purpose, etc.)

## Non-Functional Requirements

- Privacy-first architecture
- Incremental Combination Table updates (do not rebuild everything on every upload)
- Strong TypeScript typing throughout
- Proper error handling and loading states
- Clean, maintainable folder structure

## Implementation Order (Strict)

1. Project setup + folder structure
2. TypeScript interfaces + Zod schemas
3. Database schema (especially `combinations` table)
4. Profile onboarding flow
5. Wardrobe upload + AI tagging
6. Combination Table generation logic
7. Recommendation engine (table querying + daily planning input)
8. Weather integration (including destination support)
9. Daily recommendations UI with planning input

**Important Rules for Development:**
- Prioritize clean architecture and maintainability.
- Use structured outputs for all AI calls.
- Make the Combination Table the single source of truth.
- Write clear, well-commented code.

After completing the core foundation, suggest the next features to implement.

---

**End of Prompt** — Copy everything above this line into Claude Code.