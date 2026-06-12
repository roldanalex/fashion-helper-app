# 🧵 Aether Wardrobe — Complete Setup Guide

This guide walks you from zero to a working app on the internet, step by step,
in plain language. No prior experience with these services is needed.

**Time needed:** about 45 minutes
**Cost:** everything runs on free tiers, except OpenAI (add ~$5 of credit —
the app spends roughly 1–3 cents per clothing item you upload)

---

## The big picture

Aether Wardrobe is the app. To work, it talks to four outside services:

| Service | Think of it as… | Price |
| --- | --- | --- |
| **Supabase** | The app's filing cabinet — stores your profile, clothes and photos, and handles sign-in | Free |
| **Google Cloud** | The ID card office — lets people sign in with their Google account | Free |
| **OpenAI** | The stylist's brain — looks at your photos and scores outfits | ~pennies per use |
| **OpenWeatherMap** | The weather reporter | Free |
| **Vercel** | The landlord — hosts your app on the internet so any device can reach it | Free |

Each service gives you a **key** (a long string of letters and numbers — like a
password for apps). You'll collect four values along the way and paste them
into one file at the end. I'll point out each one with a 📋 **COPY THIS** mark.

> ⚠️ **Golden rule:** keys are secrets. Never share them, post them, or commit
> them to GitHub. The app is already set up so they stay out of your code.

---

## Part 1 — Supabase (the filing cabinet)

### 1.1 Create the project

1. Go to [supabase.com](https://supabase.com) and click **Start your project**.
   Sign up with your GitHub or Google account.
2. Click **New project**.
3. Pick any name (e.g. `aether-wardrobe`), set a **database password**
   (save it somewhere safe — you rarely need it, but don't lose it), and
   choose the region closest to you.
4. Click **Create new project** and wait a minute or two while it spins up.

### 1.2 Get your keys

1. In the left sidebar, click the ⚙️ **Project Settings** (bottom), then
   **API** (it may be labeled "API Keys" / "Data API").
2. 📋 **COPY THIS** → **Project URL** (looks like `https://abcdefgh.supabase.co`)
3. 📋 **COPY THIS** → the **anon / public** key (a very long string)

> The "anon" key is safe to use in a browser — it only works together with the
> security rules we set up next. The `service_role` key shown nearby is NOT
> safe; we never use it, so leave it alone.

### 1.3 Build the database tables

The app needs its tables (think: labeled drawers in the filing cabinet).
The instructions for building them are already written — you just run them.

1. In the Supabase sidebar, click **SQL Editor**.
2. On your computer, open the project folder, then the folder
   `supabase/migrations/`. You'll see six files, numbered `0001` to `0006`.
3. Open `0001_profiles.sql` in any text editor, copy ALL of it, paste it into
   the SQL Editor, and click **Run**. You should see "Success".
4. Repeat for `0002`, `0003`, `0004`, `0005`, `0006` — **in that exact order**.

✅ **Check it worked:** click **Table Editor** in the sidebar. You should see
five tables: `profiles`, `clothing_items`, `combinations`, `daily_plans`,
`shopping_suggestions`. Under **Storage**, you should see a bucket called
`wardrobe`.

---

## Part 2 — Google sign-in (the ID card office)

This lets you (and anyone you share the app with) log in with one click using
a Google account.

### 2.1 Find your callback address first

1. In Supabase, go to **Authentication → Sign In / Providers** and click
   **Google** in the providers list.
2. You'll see a **Callback URL** that looks like
   `https://abcdefgh.supabase.co/auth/v1/callback`.
   📋 **COPY THIS** — you'll paste it into Google in a moment.
   Leave this Supabase tab open.

### 2.2 Create the Google credentials

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and sign
   in with your Google account.
2. At the top, click the project dropdown → **New Project** → name it
   `aether-wardrobe` → **Create**, then make sure it's selected.
3. In the search bar at the top, type **"OAuth consent screen"** and open it
   (also called "Google Auth Platform → Branding").
   - App name: `Aether Wardrobe`
   - User support email: your email
   - Audience: **External**
   - Developer contact: your email
   - Save through the remaining steps (you can skip optional fields).
4. Now search for **"Credentials"** and open it. Click
   **+ Create credentials → OAuth client ID**.
   - Application type: **Web application**
   - Name: `aether-wardrobe-web`
   - Under **Authorized redirect URIs**, click **+ Add URI** and paste the
     Callback URL you copied from Supabase.
   - Click **Create**.
5. A box pops up with a **Client ID** and a **Client secret**.
   Keep this window open.

### 2.3 Connect Google to Supabase

1. Back in the Supabase tab (Authentication → Providers → Google):
   - Toggle **Enable Sign in with Google** ON.
   - Paste the **Client ID** and **Client secret** from Google.
   - Click **Save**.

✅ **Check it worked:** the Google provider now shows as "Enabled" in the list.

---

## Part 3 — OpenAI (the stylist's brain)

1. Go to [platform.openai.com](https://platform.openai.com) and create an
   account (this is separate from a ChatGPT subscription).
2. Add credit: go to **Settings → Billing** and add **$5** — that's plenty for
   months of personal use.
3. **Set a spending cap** (strongly recommended): in **Billing → Limits**, set
   a monthly budget of e.g. $5. If something ever misbehaves, your cost can
   never exceed this.
4. Create a key: go to **API keys** (or search "API keys"), click
   **+ Create new secret key**, name it `aether-wardrobe`.
5. 📋 **COPY THIS** → the key (starts with `sk-`). **It is shown only once** —
   if you lose it, just create a new one.

---

## Part 4 — OpenWeatherMap (the weather reporter)

1. Go to [openweathermap.org](https://openweathermap.org) and click **Sign in
   → Create an Account**.
2. After confirming your email, open your profile menu (top right) →
   **My API Keys**.
3. A default key already exists. 📋 **COPY THIS** → the key.

> ⏳ **Heads up:** brand-new OpenWeatherMap keys can take **up to 2 hours** to
> activate. If weather doesn't work right away, give it some time — everything
> else in the app works meanwhile.

---

## Part 5 — Tell the app about your keys

Now we put the four values you collected into one private file.

1. Open the project folder in your editor (VS Code, Cursor, etc.).
2. You should already have a file called `.env.local` at the top level.
   (If not, duplicate `.env.example` and rename the copy to `.env.local`.)
3. Fill it in so it looks like this — with YOUR values:

```bash
# From Supabase → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...the-very-long-one

# From OpenAI → API keys
OPENAI_API_KEY=sk-...your-key

# From OpenWeatherMap → My API Keys
OPENWEATHER_API_KEY=your-key

# Leave this as-is for now
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

4. Save the file. That's it — this file never leaves your computer (git is
   told to ignore it).

---

## Part 6 — Start the app on your computer

Open a terminal in the project folder and run:

```bash
pnpm install     # downloads the app's building blocks (first time only)
pnpm dev         # starts the app
```

When it says **Ready**, open [http://localhost:3000](http://localhost:3000)
in your browser.

### Take it for a spin

1. Click **Continue with Google** and sign in.
2. Answer the short onboarding questions (your styles, how dressed-up you
   like to be, your home city).
3. Go to **Wardrobe → Add piece** and upload a photo of one clothing item.
   💡 In the description, mention the material ("pique polo", "merino
   sweater") — the AI takes your word over its eyes.
4. Review the tags it suggests, fix anything, and hit **Confirm tags**.
5. Repeat for **6–8 pieces** (a couple of tops, bottoms, shoes at minimum).
   Each confirmation triggers outfit generation in the background — you'll
   see a toast like "Wove 14 new outfits into your table".
6. Go to **Today**, pick your occasion, and let it style you. 🎉

To stop the app, press `Ctrl + C` in the terminal. Start it again anytime
with `pnpm dev`.

---

## Part 7 — Publish it to the internet (Vercel)

Right now the app only exists on your computer. Publishing puts it at a real
web address you can open from your phone.

### 7.1 Put the code on GitHub

If the repo isn't on GitHub yet:

1. Go to [github.com/new](https://github.com/new), name it (e.g.
   `aether-wardrobe`), choose **Public** or **Private** (either works), and
   click **Create repository** — don't add any starter files.
2. In your terminal, in the project folder, run the two commands GitHub shows
   under "push an existing repository":

```bash
git remote add origin https://github.com/YOUR-USERNAME/aether-wardrobe.git
git push -u origin main
```

### 7.2 Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign up **with your GitHub
   account** — this links the two automatically.
2. Click **Add New → Project**, find your repo in the list, click **Import**.
3. Before clicking Deploy, expand **Environment Variables** and add the same
   five lines from your `.env.local` — same names, same values — with ONE
   change:
   - `NEXT_PUBLIC_SITE_URL` → leave it for now; you'll set it right after the
     first deploy when you know your address (or set it if you already chose a
     custom domain).
4. Click **Deploy** and wait ~2 minutes. Vercel gives you an address like
   `https://aether-wardrobe.vercel.app`. 📋 **COPY THIS**.
5. Go to the project's **Settings → Environment Variables**, set
   `NEXT_PUBLIC_SITE_URL` to that address, and **Redeploy** (Deployments →
   ⋯ menu → Redeploy).

### 7.3 Tell Supabase about your new address

Without this step, Google sign-in only works on your computer.

1. In Supabase: **Authentication → URL Configuration**.
2. **Site URL** → your Vercel address (`https://aether-wardrobe.vercel.app`).
3. Under **Redirect URLs**, click **Add URL** and add:
   `https://aether-wardrobe.vercel.app/auth/callback`
   (keep `http://localhost:3000/**` in the list too, so local development
   keeps working).
4. Save.

✅ **Check it worked:** open your Vercel address on your **phone**, sign in
with Google, and your wardrobe is there. Add the page to your home screen and
it behaves like an app.

---

## 🛟 Troubleshooting

| Problem | Likely cause & fix |
| --- | --- |
| Google sign-in bounces back to the landing page | The callback URL is missing somewhere. Re-check Part 2.2 step 4 (Google) and Part 7.3 (Supabase redirect URLs). |
| "Could not start Google sign-in" | Google provider not enabled in Supabase, or wrong Client ID/secret. Redo Part 2.3. |
| Photos upload but tagging says "Needs retry" | OpenAI key wrong, or no billing credit. Check Part 3, then open the item and press **Re-analyze**. |
| Weather error on the Today page | OpenWeatherMap key still activating (wait up to 2 h) or typo in `.env.local`. |
| Images don't show in the wardrobe grid | Migration `0006` (storage) wasn't run, or you created the bucket by hand with a different name. Re-run Part 1.3. |
| Changed `.env.local` but nothing happened | Stop the app (`Ctrl + C`) and run `pnpm dev` again — keys load at startup. |
| It works locally but not on Vercel | Compare Vercel's Environment Variables against your `.env.local` line by line, then Redeploy. |

---

## What you've built

```text
Your phone/computer
        │
        ▼
   Vercel (the app)
        │
        ├──► Supabase ── your data, photos, sign-in
        ├──► OpenAI ──── reads photos, scores outfits
        └──► OpenWeatherMap ── today's forecast
```

Total monthly cost for personal use: **$0 + OpenAI pennies**. Enjoy dressing
well. 🧵

— *Aether Wardrobe v1.0.0 · Created by Alexis Roldan · 2026*
