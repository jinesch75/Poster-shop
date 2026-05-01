# Gridline Cities

Online shop for architectural posters in a De Stijl / Piet Mondrian-inspired style. Launching with London; extending to Paris, Rome, New York, and other capitals.

---

## What's in this scaffold

**Session 1**
- Next.js 15 + TypeScript + App Router
- Outfit (display) + Manrope (body) via `next/font`
- Full design system in `app/globals.css`
- Homepage + basic product detail page with the 8-poster London set

**Session 2 (this commit)**
- Prisma + Postgres schema covering cities, posters, bundles, customers, orders, subscribers
- Storage abstraction at `lib/storage.ts` — Railway volume in prod, `./uploads` locally
- Streaming route at `/api/storage/[...key]` (masters blocked until signed URLs in Session 4)
- Sharp-based watermark pipeline at `lib/watermark.ts` — one master → private copy + thumbnail + preview (diagonal "GRIDLINE · CITIES" overlay) + two room mockups
- Admin panel at `/admin` gated by `ADMIN_PASSWORD` env var (signed JWT cookie via `jose`, edge-safe middleware)
- Admin screens: dashboard, posters list/new/edit, cities editor
- Seed script at `prisma/seed.ts` ports the 8 London posters into the DB

**Still to come**
- Session 3 — rewire public site to read from Postgres, bundles, city index pages
- Session 4 — Stripe Checkout, Auth.js magic links, signed-URL download flow (48h / 5 downloads)
- Session 5 — Plausible, Resend newsletter, legal pages, custom domain

---

## Run it locally

Requires Node.js 20+ and a Postgres instance (Docker works: `docker run -p 5432:5432 -e POSTGRES_PASSWORD=dev postgres:16`).

```bash
cd gridline-cities
cp .env.example .env.local   # then edit DATABASE_URL, AUTH_SECRET, ADMIN_PASSWORD
npm install
npm run db:push              # creates tables from prisma/schema.prisma
npm run db:seed              # loads the 8 London posters
npm run dev
```

Then open http://localhost:3000 (public site) or http://localhost:3000/admin (admin login — use `ADMIN_PASSWORD` from `.env.local`).

---

## Deploy to Railway (when you're ready)

1. Push this folder to a GitHub repo (see "Push to GitHub" below).
2. In Railway, create a new project → "Deploy from GitHub repo" → select the repo.
3. Railway auto-detects Next.js. It will run `npm run build` then `npm start`.
4. Railway's default subdomain will work immediately (e.g. `gridline-cities.up.railway.app`).
5. When you're ready for a custom domain, add it in Railway's settings and point your DNS there.

Environment variables — for now the app runs without any. Session 2 onwards will need the variables in `.env.example` (database URL, Stripe keys, etc.).

---

## Push to GitHub

From this `gridline-cities` folder:

```bash
git init
git add .
git commit -m "Initial scaffold: Next.js 15 + design system + homepage"

# Create a new empty repo at github.com first, then:
git remote add origin https://github.com/YOUR-USERNAME/gridline-cities.git
git branch -M main
git push -u origin main
```

---

## Project structure

```
gridline-cities/
├── app/
│   ├── layout.tsx           Root layout — loads fonts, sets metadata
│   ├── page.tsx             Homepage — hero, gallery, cities, mockups, manifesto, newsletter
│   ├── globals.css          Design system — tokens + all component styles
│   └── shop/[slug]/page.tsx Product detail page (basic, checkout TBD)
├── components/
│   ├── PosterCard.tsx       Gallery card — image + watermark + metadata
│   └── Watermark.tsx        Diagonal "GRIDLINE · CITIES" overlay
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

**Wordmark** — "Gridline" in 600-weight + "Cities" (in `.studio-sub` class) in 300-weight muted grey. Used in both the nav and the footer.

---

## Assets

Master poster files live in `public/posters/` at 1856×2464 px. In Session 2 these will move into object storage (Cloudflare R2 or a Railway volume) and be served via signed URLs post-purchase. The public-bucket placeholder files stay in place for development convenience but should be removed before production launch.
