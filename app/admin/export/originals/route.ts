// "Download all originals" — one zip of every poster's master file, for
// backing up on your own computer.
//
// Files are named for humans, not by storage key:
//   Main gallery/London/Big Ben.png
//   Mondrian gallery/London/Tower Bridge Mondrian Style.png
//   Drafts/Toronto/CN Tower.png
// plus index.csv listing every poster (title, city, gallery, status, web
// address, pixel size, file name in the zip, original storage key).
//
// The zip is streamed as it's built (no compression — the PNG/JPG masters
// are already compressed), so memory stays flat however big the catalogue
// gets. Only masters are included: previews, thumbnails and mockups are
// regenerated from them by Maintenance → Regenerate.
//
// Protected twice: the middleware guards everything under /admin, and the
// handler checks the admin cookie itself.

import { promises as fs } from 'fs';
import path from 'path';
import { PassThrough, Readable } from 'stream';
import archiver from 'archiver';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readStream, resolveKey } from '@/lib/storage';
import { catalogueOrder } from '@/lib/poster-order';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Make a title safe as a file name on macOS, Windows and Linux. */
function safeName(s: string): string {
  return (
    s
      .replace(/[\/\\:*?"<>|\u0000-\u001f]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^\.+/, '')
      .slice(0, 120) || 'untitled'
  );
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function fileExists(key: string): Promise<boolean> {
  if (key.startsWith('public:')) {
    const rel = key.slice('public:'.length).replace(/^\//, '');
    return fs.stat(path.join(process.cwd(), 'public', rel)).then(() => true, () => false);
  }
  return fs.stat(resolveKey(key)).then((st) => st.isFile(), () => false);
}

export async function GET() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!(await verifyAdminToken(token))) {
    return new Response('Not authorised', { status: 401 });
  }

  const posters = (
    await prisma.poster.findMany({
      select: {
        title: true,
        slug: true,
        status: true,
        gallery: true,
        masterKey: true,
        masterWidthPx: true,
        masterHeightPx: true,
        city: { select: { name: true, number: true } },
      },
    })
  ).sort(catalogueOrder);

  const archive = archiver('zip', { store: true });
  const out = new PassThrough();
  archive.on('warning', (err) => console.warn('[export] zip warning', err));
  archive.on('error', (err) => {
    console.error('[export] zip error', err);
    out.destroy(err);
  });
  archive.pipe(out);

  // Build the archive in the background while the response streams.
  void (async () => {
    const used = new Set<string>();
    const rows: string[] = [
      ['title', 'city', 'gallery', 'status', 'web address', 'width px', 'height px', 'file in zip', 'storage key']
        .map(csvCell)
        .join(','),
    ];

    for (const p of posters) {
      const top =
        p.status !== 'PUBLISHED'
          ? p.status === 'DRAFT'
            ? 'Drafts'
            : 'Archived'
          : p.gallery === 'MONDRIAN'
            ? 'Mondrian gallery'
            : 'Main gallery';
      const ext = path.extname(p.masterKey).toLowerCase() || '.png';
      const base = `${top}/${safeName(p.city.name)}/${safeName(p.title)}`;
      let name = `${base}${ext}`;
      for (let n = 2; used.has(name.toLowerCase()); n += 1) name = `${base} (${n})${ext}`;

      let inZip = name;
      if (await fileExists(p.masterKey)) {
        used.add(name.toLowerCase());
        archive.append(readStream(p.masterKey), { name });
      } else {
        inZip = 'MISSING — original file not found on the server';
      }

      rows.push(
        [
          p.title,
          p.city.name,
          p.gallery === 'MONDRIAN' ? 'Mondrian' : 'Main',
          p.status.toLowerCase(),
          `/shop/${p.slug}`,
          p.masterWidthPx,
          p.masterHeightPx,
          inZip,
          p.masterKey,
        ]
          .map(csvCell)
          .join(','),
      );
    }

    // UTF-8 BOM so Excel opens accents correctly.
    archive.append('﻿' + rows.join('\n') + '\n', { name: 'index.csv' });
    await archive.finalize();
  })().catch((err) => {
    console.error('[export] failed while building zip', err);
    archive.abort();
    out.destroy(err instanceof Error ? err : new Error(String(err)));
  });

  const date = new Date().toISOString().slice(0, 10);
  return new Response(Readable.toWeb(out) as ReadableStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="gridline-cities-originals-${date}.zip"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
