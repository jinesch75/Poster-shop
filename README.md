# Linework Studio

Online shop for architectural posters in a De Stijl / Piet Mondrian-inspired style. Launching with London; extending to Paris, Rome, New York, and other capitals.

---

## What's in this scaffold (Session 1)

- Next.js 15 + TypeScript + App Router
- Outfit (display) + Manrope (body) loaded via `next/font`
- Full design system in `app/globals.css` (tokens, typography, components)
- Fully-rendered homepage at `/` with all eight London posters
- Basic product detail page at `/shop/[slug]` (static; checkout wires up in Session 4)
- Watermark overlay component applied to every poster preview

Still to come (see `PROJECT_PLAN.md` in the parent folder):
- Session 2 — Postgres schema via Prisma + admin panel upload flow with server-side watermark pipeline
- Session 3 — Polish the product detail page, bundles, city index pages
- Session 4 — Stripe Checkout, customer accounts (Auth.js magic links), signed-URL download flow
- Session 5 — Plausible analytics, Resend newsletter, legal pages, Railway deploy, custom domain

---

## Run it locally

```bash
cd linework-studio
npm install
npm run dev
```

Then open http://localhost:3000.

Requires Node.js 20+.

---

## Deploy to Railway (when you're ready)

1. Push this folder to a GitHub repo (see "Push to GitHub" below).
2. In Railway, create a new project → "Deploy from GitHub repo" → select the repo.
3. Railway auto-detects Next.js. It will run `npm run build` then `npm start`.
4. Railway's default subdomain will work immediately (e.g. `linework-studio.up.railway.app`).
5. When you're ready for a custom domain, add it in Railway's settings and point your DNS there.

Environment variables — for now the app runs without any. Session 2 onwards will need the variables in `.env.example` (database URL, Stripe keys, etc.).

---

## Push to GitHub

From this `linework-studio` folder:

```bash
git init
git add .
git commit -m "Initial scaffold: Next.js 15 + design system + homepage"

# Create a new empty repo at github.com first, then:
git remote add origin https://github.com/YOUR-USERNAME/linework-studio.git
git branch -M main
git push -u origin main
```

---

## Project structure

```
linework-studio/
├── app/
│   ├── layout.tsx           Root layout — loads fonts, sets metadata
│   ├── page.tsx             Homepage — hero, gallery, cities, mockups, manifesto, newsletter
│   ├── globals.css          Design system — tokens + all component styles
│   └── shop/[slug]/page.tsx Product detail page (basic, checkout TBD)
├── components/
│   ├── PosterCard.tsx       Gallery card — image + watermark + metadata
│   └── Watermark.tsx        Diagonal "LINEWORK · STUDIO" overlay
├── lib/
│   ├── fonts.ts             next/font setup for Outfit and Manrope
│   └── posters.ts           Seed data — 8 London posters + 5 cities
├── public/
│   └── posters/             The 8 London master images
├── .env.example             Env template (nothing required in Session 1)
├── next.config.mjs
├── package.json
├── tsconfig.json
└── README.md
```

---

## Design system

**Typography** — Outfit (display, weights 200–700) + Manrope (body, 300–700). All type scales are defined as `clamp()` functions in `globals.css` so they shrink gracefully on smaller screens.

**Colour tokens** (defined in `:root`):

- `--paper` `#F7F4EE` — warm off-white background
- `--paper-warm` `#EFEAE0` — slight card contrast
- `--ink` `#1A1A1A` — primary text
- `--ink-soft` `#444340` — secondary text
- `--mute` `#8A8680` — metadata, labels
- `--rule` `#E4DECF` — hairline dividers
- `--accent` `#3B4E5A` — deep slate — only UI accent colour; never use the vivid primaries from the artwork in the UI

**Emphasis** — the `.italic` class no longer means italic. It means "accent-color emphasis word" (used on the trailing word of hero headlines and section titles). This keeps the design calm and Scandinavian rather than decorative.

**Wordmark** — "Linework" in 600-weight + "Studio" (in `.studio-sub` class) in 300-weight muted grey. Used in both the nav and the footer.

---

## Assets

Master poster files live in `public/posters/` at 1856×2464 px. In Session 2 these will move into object storage (Cloudflare R2 or a Railway volume) and be served via signed URLs post-purchase. The public-bucket placeholder files stay in place for development convenience but should be removed before production launch.
