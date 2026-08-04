# Restoring Gridline Cities from a parked state

Written 2026-08-04, when the Railway project was parked to stop compute billing.

At park time the site was live at gridlinecities.com, running one Next.js
service plus Postgres, costing ~$20/month — of which ~$15 was RAM held by an
idle service serving about 16 bot requests an hour.

---

## Where everything lives

| Thing | Location | Notes |
|---|---|---|
| Code | `github.com/jinesch75/Poster-shop`, branch `main` | Also in iCloud. At park: `d24e285` |
| Images | `~/Desktop/gridline-volume-backup-2026-08-04/linework/` | 4,716 files, 1.07 GB, verified against remote |
| Database | `~/Desktop/gridline-backup/gridline-db-2026-08-04.dump` | pg_dump custom format, 37 KB, 10 tables |
| Secrets | `~/Desktop/gridline-backup/vars-app.json`, `vars-postgres.json` | **Plaintext live Stripe key. Never commit.** |

The Railway project `daring-reprieve` still exists with volumes intact — the
backups are a second copy, not the only one. If the project is later deleted,
they become the only copy.

### Image volume layout

Mounted at `/data`, so `STORAGE_ROOT=/data/linework`:

```
masters/      274 MB   private high-res originals — IRREPLACEABLE
previews/     250 MB   ~1200px watermarked        — regenerable
thumbnails/    51 MB   ~500px watermarked         — regenerable
mockups/      498 MB   office + living-room composites — regenerable
```

Only `masters/` genuinely matters. The other 799 MB rebuilds from it via
`lib/watermark.ts`. If a future restore is painful, restore masters first and
regenerate the rest.

---

## Path A — project still exists (the common case)

Compute was stopped by removing deployments; volumes and Postgres data stayed.

1. **Redeploy Postgres FIRST and wait for it to come Online.**
2. Then redeploy Poster-shop — dashboard → Deployments → redeploy, or push a
   commit if autodeploy is still connected.
3. Confirm: `railway metrics`, then load gridlinecities.com.

**Order matters.** The `start` command begins with
`prisma db push --skip-generate --accept-data-loss`, so the app cannot boot
without a reachable database — it exits and the deployment goes to Failed.
This is exactly what happened during parking on 2026-08-04: a GitHub autodeploy
landed after Postgres had been taken down, and failed on that first command.
The failure is benign and means nothing is wrong with the code.

Note also that autodeploy was disabled at park time. If a push mysteriously
doesn't deploy, that's why — redeploy from the dashboard instead.

DNS, env vars, Stripe webhook and the volume are all untouched. Minutes, not
hours.

---

## Path B — project deleted, rebuilding from scratch

1. **Create project and services**

   ```bash
   railway init                       # new project
   railway add --database postgres
   railway add --repo jinesch75/Poster-shop
   railway volume add --mount-path /data     # attach to the app service
   ```

2. **Restore env vars** from `vars-app.json`. Set each with
   `railway variable set KEY=value`. `DATABASE_URL` should reference the new
   Postgres service, not the value in the backup — the old host is gone.

   Required (see `.env.example`): `NEXT_PUBLIC_SITE_URL`, `AUTH_SECRET`,
   `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `BREVO_API_KEY`,
   `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, `BREVO_NEWSLETTER_LIST_ID`,
   `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `STORAGE_ROOT=/data/linework`.

   Plus the cost fixes added at park time:
   `NODE_OPTIONS=--max-old-space-size=512`, `MALLOC_ARENA_MAX=2`,
   `NEXT_TELEMETRY_DISABLED=1`.

3. **Restore images**

   ```bash
   railway volume files --volume <name> upload \
     ~/Desktop/gridline-volume-backup-2026-08-04/linework /linework
   ```

   Verify with the same check used at backup time — compare
   `find … -type f -size +0 | wc -l` and `du -sk` on both sides.

4. **Restore the database** — do this *after* the first deploy has run
   `prisma db push`, so the schema exists:

   ```bash
   pg_restore --no-owner --data-only \
     -d "<new DATABASE_PUBLIC_URL>" \
     ~/Desktop/gridline-backup/gridline-db-2026-08-04.dump
   ```

5. **Stripe** — create a new webhook endpoint at
   `https://<domain>/api/webhooks/stripe`. It issues a **new signing secret**;
   the old `STRIPE_WEBHOOK_SECRET` is dead. Update the variable.

6. **DNS** — point gridlinecities.com at the new Railway domain
   (`railway domain`). The registrar is external to Railway, so records
   survive; only the target changes.

7. **Brevo** — API key still valid. Newsletter list ID is 3.

---

## Gotchas that will bite

**`start` runs `prisma db push --accept-data-loss` on every deploy.** Fine
when the schema is stable, dangerous when it isn't — a dropped column executes
without prompting. Consider switching to `prisma migrate deploy` before making
schema changes.

**The seed runs on every deploy too.** Any field an admin can edit must use
`update: {}` in its upsert, or the seed silently reverts admin edits on the
next deploy. This has caused a bug before.

**Storage keys have two forms.** `public:/posters/foo.png` means
`public/posters/` in the repo; anything else is volume-backed and resolved via
`lib/storage.ts`. A restore that only fills the volume still relies on the
repo's `public/posters/` for the legacy seed rows.

**Masters are deliberately unreachable over HTTP.** `app/api/storage/[...key]`
returns 403 for `masters/`. Backups must come from the volume, not the web —
don't "verify" a restore by fetching master URLs and concluding it failed.

**Postgres public URL vs internal.** `postgres.railway.internal` only resolves
inside Railway. For pg_dump/pg_restore from a laptop, use the
`*.proxy.rlwy.net` URL.

---

## Cost notes for next time

Billing at park time, from `railway metrics`:

- RAM 1.54 GB constant → ~$15/mo at $10/GB/mo. **The entire problem.**
- CPU ~0%, egress ~0 MB → negligible.
- Volumes 1.26 GB + 0.22 GB → ~$0.22/mo total.
- Hobby subscription → $5/mo, charged even with zero services.

The 1.54 GB was mostly memory *held*, not needed: Node sizes its heap from the
container's 8 GB ceiling, and sharp's libvips cache pinned native memory from
20–40 MB masters. Fixed in `d24e285` plus the NODE_OPTIONS variable, but the
result was never measured — the project was parked first. **Verify with
`railway metrics` after the next deploy.**

Serverless/app-sleeping was considered and rejected: Railway sleeps on 10
minutes of no *outbound* traffic, and Prisma's connection pool plus constant
bot traffic would likely keep it awake. Revisit only with the pool torn down
on idle.

Railway storage buckets ($0.015/GB/mo, free egress) are 10× cheaper than
volumes and would suit the images better than the volume `lib/storage.ts`
currently targets. Irrelevant at 1.2 GB; relevant at 20 GB.
