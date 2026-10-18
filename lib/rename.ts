// Bulk rename logic behind /admin/posters/rename.
//
// Takes the edited rows (title, number, web address per poster id), saves
// every valid change in one transaction, and reports the rows it had to
// skip or adjust. Invalid rows never block the valid ones.
//
// When a web address changes, the old address is recorded in
// PosterSlugRedirect so /shop/<old> keeps working (see getRenamedSlug in
// lib/posters.ts).

import { prisma } from './prisma';
import { slugify } from './slug';

export type RenameRow = { id: string; title: string; slug: string };
export type RenameIssue = { title: string; message: string };
export type RenameResult = { saved: number; moved: number; issues: RenameIssue[] };

export async function applyRenames(rows: RenameRow[]): Promise<RenameResult> {
  const posters = await prisma.poster.findMany({
    select: { id: true, slug: true, title: true },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));

  const issues: RenameIssue[] = [];
  type Change = { id: string; oldSlug: string; title: string; slug: string };
  const changes: Change[] = [];

  // Pass 1: each row's own fields.
  for (const p of posters) {
    const row = byId.get(p.id);
    if (!row) continue; // poster wasn't on the page (e.g. uploaded meanwhile)
    const title = row.title.trim();
    let slug = slugify(row.slug);

    if (!title) {
      issues.push({ title: p.title, message: 'Title can’t be empty — row not saved.' });
      continue;
    }
    if (!slug) {
      issues.push({ title, message: 'Web address can’t be empty — kept the old one.' });
      slug = p.slug;
    }
    if (title === p.title && slug === p.slug) continue;
    changes.push({ id: p.id, oldSlug: p.slug, title, slug });
  }

  // Pass 2: web addresses must be unique across ALL posters' final values.
  // Repeat until stable — reverting one clash can create another.
  const finalSlug = new Map(posters.map((p) => [p.id, p.slug]));
  for (const c of changes) finalSlug.set(c.id, c.slug);
  for (let guard = 0; guard < 10; guard += 1) {
    const count = new Map<string, number>();
    for (const s of finalSlug.values()) count.set(s, (count.get(s) ?? 0) + 1);
    const clashing = changes.filter(
      (c) => c.slug !== c.oldSlug && (count.get(c.slug) ?? 0) > 1,
    );
    if (clashing.length === 0) break;
    for (const c of clashing) {
      issues.push({
        title: c.title,
        message: `“${c.slug}” is already used by another poster — kept “${c.oldSlug}”.`,
      });
      c.slug = c.oldSlug;
      finalSlug.set(c.id, c.oldSlug);
    }
  }

  // Drop rows whose only change was a rejected web address.
  const original = new Map(posters.map((p) => [p.id, p]));
  const effective = changes.filter((c) => {
    const p = original.get(c.id)!;
    return c.title !== p.title || c.slug !== p.slug;
  });
  changes.length = 0;
  changes.push(...effective);

  const slugChanges = changes.filter((c) => c.slug !== c.oldSlug);

  await prisma.$transaction(async (tx) => {
    // Park changing slugs on a temporary value first so swaps (A→B, B→A)
    // don't trip the unique constraint halfway through.
    for (const c of slugChanges) {
      await tx.poster.update({
        where: { id: c.id },
        data: { slug: `__renaming__${c.id}` },
      });
    }
    for (const c of changes) {
      await tx.poster.update({
        where: { id: c.id },
        data: { title: c.title, slug: c.slug },
      });
    }
    for (const c of slugChanges) {
      await tx.posterSlugRedirect.upsert({
        where: { oldSlug: c.oldSlug },
        create: { oldSlug: c.oldSlug, posterId: c.id },
        update: { posterId: c.id },
      });
    }
    // An address that's live again (renamed back, or taken by another
    // poster) no longer redirects.
    await tx.posterSlugRedirect.deleteMany({
      where: { oldSlug: { in: [...finalSlug.values()] } },
    });
  });

  return { saved: changes.length, moved: slugChanges.length, issues };
}
