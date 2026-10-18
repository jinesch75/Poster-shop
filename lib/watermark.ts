// Watermark + derivative pipeline.
//
// One master file in → master + preview + thumbnail + office mockup out.
// (The living-room triptych mockup needs sibling posters and is built by
// a separate function — see refreshLivingRoomMockups in step 4.)
//
// Strategy: resolution is the main protection. The clean 4000px+ master
// stays private, served only via signed download URLs after purchase. The
// public 1200px preview is gorgeous on screen but useless for printing at
// any meaningful size — at 300dpi it tops out around postcard size. The
// thumbnail is even smaller (500px) for grid display.
//
// On top of that, the public preview and thumbnail are visibly marked
// with a faint diagonal "GRIDLINE · CITIES" band and "gridlinecities.com"
// in the bottom-right corner (restored 2026-10-17; the QR badge that
// briefly came back with it was dropped again 2026-10-18).
//
// Purchased downloads carry only the small "gridlinecities.com" credit in
// the bottom-right corner — see stampDownloadCredit(). The master on disk
// stays clean; the credit is added on the fly in the download route.
// Mockups are composited from the marked preview, so they carry it too.
// Masters are never marked.
//
// Text is drawn from vector outlines in ./watermark-glyphs.ts rather than
// SVG <text>, so it doesn't depend on fonts being installed on the server.
//
// Mockup composition reads two scene plates from public/mockups/:
//   - office.jpg          — single empty portrait frame above a desk
//   - living-room.jpg     — three empty portrait frames in a row above a sofa
// Each plate has a JSON sidecar (<name>.frames.json) marking the inner
// rectangle of every frame. The compositor resizes the poster to fill that
// inner rectangle (fit: cover) and pastes it on top of the plate. The
// scenes are intentionally shot square-on, so a rectangular composite is
// visually correct — no perspective warp needed.

import sharp from 'sharp';
import path from 'path';
import { promises as fs } from 'fs';
import { putBuffer, readBuffer } from './storage';
import { prisma } from './prisma';
import { getSiblingPairsForPoster } from './mockup-siblings';
import { DIAGONAL_TEXT, GLYPH_UNITS, SITE_TEXT } from './watermark-glyphs';

// ---------- sharp memory tuning ----------
//
// Runs once, on module load — this is the only module that touches sharp at
// runtime, so configuring here also covers the seed and any tsx scripts
// (an instrumentation.ts hook would not).
//
// libvips keeps decoded images in an operation cache by default. That's a
// win for a server resizing the same small assets repeatedly; it's a loss
// for us, because our inputs are 20–40 MB one-shot masters that are resized
// once and never seen again. The cache just pins tens of MB of native
// memory per poster that the process never gives back.
//
// concurrency(1) caps libvips' worker threads. It defaults to the CPU count,
// and each thread carries its own tile buffers — pointless when the metrics
// show CPU sitting at ~0% and the work is sequential anyway.
sharp.cache(false);
sharp.concurrency(1);

// ---------- Asset dimensions ----------

/** Public preview: large enough to look great on a 4K screen, too small to print well. */
const PREVIEW_TARGET_WIDTH = 1200;

/** Public thumbnail: grid display only. */
const THUMB_TARGET_WIDTH = 500;

// ---------- Watermark tuning ----------

/** Opacity of the diagonal wordmark band. */
const DIAGONAL_OPACITY = 0.12;

// ---------- Public types ----------

export type PosterDerivatives = {
  masterKey: string;
  previewKey: string;
  thumbnailKey: string;
  mockupOfficeKey: string;
  widthPx: number;
  heightPx: number;
};

// ---------- Pipeline ----------

/**
 * Run the full pipeline: write master + generate three public derivatives
 * + the office mockup. Returns storage keys for all of them.
 *
 * @param masterBuffer raw bytes of the uploaded master file (PNG/JPG)
 * @param ext          original master extension (informs the master file's stored ext)
 */
export async function processMaster(
  masterBuffer: Buffer,
  ext: 'png' | 'jpg' = 'png',
): Promise<PosterDerivatives> {
  const masterKey = await putBuffer('masters', masterBuffer, ext);
  return runDerivatives(masterBuffer, masterKey);
}

/**
 * Rebuild derivatives from an already-uploaded master.
 *
 * Used by the per-poster "Regenerate previews & mockups" admin button and
 * by the bulk backfill route.
 */
export async function reprocessMaster(
  masterKey: string,
): Promise<PosterDerivatives> {
  const buffer = await readBuffer(masterKey);
  return runDerivatives(buffer, masterKey);
}

// ---------- Internal: derivative generation ----------

async function runDerivatives(
  masterBuffer: Buffer,
  masterKey: string,
): Promise<PosterDerivatives> {
  const meta = await sharp(masterBuffer).metadata();
  const width = meta.width ?? 1856;
  const height = meta.height ?? 2464;

  // ---- Preview (1200px) ---------------------------------------------
  // Cap target width at the master's actual width so we never upscale.
  const previewWidth = Math.min(PREVIEW_TARGET_WIDTH, width);
  const previewHeight = Math.round((height / width) * previewWidth);

  const previewBuffer = await sharp(masterBuffer)
    .resize({ width: previewWidth, withoutEnlargement: true })
    .composite([
      { input: Buffer.from(diagonalWordmarkSvg(previewWidth, previewHeight)), top: 0, left: 0 },
      { input: Buffer.from(cornerWordmarkSvg(previewWidth, previewHeight)), top: 0, left: 0 },
    ])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  const previewKey = await putBuffer('previews', previewBuffer, 'jpg');

  // ---- Thumbnail (500px) --------------------------------------------
  const thumbWidth = Math.min(THUMB_TARGET_WIDTH, width);
  const thumbHeight = Math.round((height / width) * thumbWidth);
  const thumbBuffer = await sharp(masterBuffer)
    .resize({ width: thumbWidth, withoutEnlargement: true })
    .composite([
      { input: Buffer.from(diagonalWordmarkSvg(thumbWidth, thumbHeight)), top: 0, left: 0 },
      { input: Buffer.from(cornerWordmarkSvg(thumbWidth, thumbHeight)), top: 0, left: 0 },
    ])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  const thumbnailKey = await putBuffer('thumbnails', thumbBuffer, 'jpg');

  // ---- Office mockup -------------------------------------------------
  // Single frame, no siblings needed — built inline at upload time.
  // The living-room triptych mockups depend on sibling posters and are
  // produced separately by refreshLivingRoomMockups() once the row exists.
  const mockupOfficeBuffer = await buildOfficeMockup(previewBuffer);
  const mockupOfficeKey = await putBuffer('mockups', mockupOfficeBuffer, 'jpg');

  return {
    masterKey,
    previewKey,
    thumbnailKey,
    mockupOfficeKey,
    widthPx: width,
    heightPx: height,
  };
}

// ---------- Watermark overlays ----------

/**
 * Repeating diagonal band of "GRIDLINE · CITIES" across the whole image,
 * rotated -28°, at low opacity. Sized relative to the image so it looks the
 * same on a 500px thumbnail and a 1200px preview.
 */
function diagonalWordmarkSvg(width: number, height: number): string {
  const fontSize = Math.min(width, height) * 0.045;
  const scale = fontSize / GLYPH_UNITS;
  const textWidth = DIAGONAL_TEXT.width * scale;
  const gap = fontSize * 5.5;
  const count = Math.ceil((width + height) / gap) + 2;
  const x = width / 2 - textWidth / 2;
  const rows: string[] = [];
  for (let i = -count; i < count; i += 1) {
    const y = i * gap + height / 2;
    rows.push(
      `<use href="#gc" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${scale.toFixed(4)})"/>`,
    );
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs><path id="gc" d="${DIAGONAL_TEXT.d}"/></defs>
  <g fill="#1a1a1a" fill-opacity="${DIAGONAL_OPACITY}" transform="rotate(-28 ${width / 2} ${height / 2})">
    ${rows.join('\n    ')}
  </g>
</svg>`;
}

/**
 * "gridlinecities.com" in the bottom-right corner.
 *
 * @param sizeFraction font size as a fraction of the image's shorter side
 * @param opacity      fill opacity of the text
 */
function siteCreditSvg(
  width: number,
  height: number,
  sizeFraction: number,
  opacity: number,
): string {
  const fontSize = Math.min(width, height) * sizeFraction;
  const scale = fontSize / GLYPH_UNITS;
  const x = width - width * 0.035 - SITE_TEXT.width * scale;
  const y = height - height * 0.03;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <path fill="#1a1a1a" fill-opacity="${opacity}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${scale.toFixed(4)})" d="${SITE_TEXT.d}"/>
</svg>`;
}

/** Corner credit on public previews and thumbnails. */
function cornerWordmarkSvg(width: number, height: number): string {
  return siteCreditSvg(width, height, 0.022, 0.5);
}

/**
 * Add the small "gridlinecities.com" credit to a purchased master, at
 * download time. Smaller and quieter than the preview mark — a signature,
 * not a watermark — and nothing else is added. Output keeps the master's
 * format: PNG stays lossless, JPEG is re-encoded at high quality.
 */
export async function stampDownloadCredit(
  masterBuffer: Buffer,
  ext: string,
): Promise<Buffer> {
  const meta = await sharp(masterBuffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) return masterBuffer;

  const img = sharp(masterBuffer).composite([
    { input: Buffer.from(siteCreditSvg(width, height, 0.012, 0.45)), top: 0, left: 0 },
  ]);
  return ext === '.jpg' || ext === '.jpeg'
    ? img.jpeg({ quality: 95, mozjpeg: true }).toBuffer()
    : img.png({ compressionLevel: 9 }).toBuffer();
}

// ---------- Mockup composition ----------

type FrameSlot = {
  index: number;
  innerTopLeft: [number, number];
  innerTopRight: [number, number];
  innerBottomRight: [number, number];
  innerBottomLeft: [number, number];
};

type FramesSidecar = {
  imageWidth: number;
  imageHeight: number;
  frames: FrameSlot[];
};

const SCENE_DIR = path.join(process.cwd(), 'public', 'mockups');

async function loadScene(
  name: 'office' | 'living-room',
): Promise<{ plate: Buffer; sidecar: FramesSidecar }> {
  const platePath = path.join(SCENE_DIR, `${name}.jpg`);
  const sidecarPath = path.join(SCENE_DIR, `${name}.frames.json`);
  const [plate, sidecarRaw] = await Promise.all([
    fs.readFile(platePath),
    fs.readFile(sidecarPath, 'utf-8'),
  ]);
  return { plate, sidecar: JSON.parse(sidecarRaw) as FramesSidecar };
}

/** Single-frame office mockup: poster fills the only frame in office.jpg. */
export async function buildOfficeMockup(posterBuffer: Buffer): Promise<Buffer> {
  const { plate, sidecar } = await loadScene('office');
  if (sidecar.frames.length < 1) {
    throw new Error('office.frames.json has no frame slots');
  }
  return compositeIntoFrames(plate, [
    { posterBuffer, frame: sidecar.frames[0] },
  ]);
}

/**
 * Triptych living-room mockup. Three frames in a row above a sofa: the
 * main poster sits in the centre frame, the two siblings bookend it on
 * the left and right.
 *
 * The caller picks which siblings to pass — typically two posters from
 * the same gallery as the main poster, preferring the same city.
 */
export async function buildLivingRoomMockup(
  mainPoster: Buffer,
  siblingLeft: Buffer,
  siblingRight: Buffer,
): Promise<Buffer> {
  const { plate, sidecar } = await loadScene('living-room');
  if (sidecar.frames.length < 3) {
    throw new Error('living-room.frames.json must have at least 3 frame slots');
  }
  // The frames in the living-room photo have thinner borders than the
  // single office frame, which makes the room mockup feel less weighty
  // when posters are dropped in. Painting an extra ring of black around
  // each poster doubles the visible border thickness without re-shooting
  // the room.
  const extraBorderPx = LIVING_ROOM_EXTRA_BORDER_PX;
  return compositeIntoFrames(plate, [
    { posterBuffer: siblingLeft, frame: sidecar.frames[0], extraBorderPx },
    { posterBuffer: mainPoster, frame: sidecar.frames[1], extraBorderPx },
    { posterBuffer: siblingRight, frame: sidecar.frames[2], extraBorderPx },
  ]);
}

/** Width of the painted black ring added around each poster in the
 *  living-room mockup. The photo's existing frame border is ~4px, so
 *  4 here doubles the visible border to ~8px. */
const LIVING_ROOM_EXTRA_BORDER_PX = 4;

/** Hex-decoded RGB of the matte-black frame colour (--ink, #1a1a1a). */
const FRAME_BLACK = { r: 26, g: 26, b: 26 } as const;

async function compositeIntoFrames(
  plate: Buffer,
  slots: Array<{
    posterBuffer: Buffer;
    frame: FrameSlot;
    /** If > 0, paint an N-pixel black ring around the poster inside the
     *  frame slot. Used by the living-room mockup to bulk up its thin
     *  in-photo frame borders; the office mockup leaves it at 0. */
    extraBorderPx?: number;
  }>,
): Promise<Buffer> {
  // Both scenes are square-on photos, so the inner rectangles are
  // axis-aligned. A cover-resize + rectangular composite reproduces what
  // the eye expects without needing a perspective transform. The aspect
  // mismatch (poster 3:4 vs frame ~7:10) is absorbed by `fit: 'cover'`,
  // which crops a small sliver from the poster's top/bottom rather than
  // letterboxing or stretching.
  const composites = await Promise.all(
    slots.map(async ({ posterBuffer, frame, extraBorderPx = 0 }) => {
      const left = frame.innerTopLeft[0];
      const top = frame.innerTopLeft[1];
      const w = frame.innerTopRight[0] - frame.innerTopLeft[0];
      const h = frame.innerBottomLeft[1] - frame.innerTopLeft[1];

      const posterW = Math.max(1, w - 2 * extraBorderPx);
      const posterH = Math.max(1, h - 2 * extraBorderPx);
      const fittedPoster = await sharp(posterBuffer)
        .resize(posterW, posterH, { fit: 'cover', position: 'center' })
        .toBuffer();

      if (extraBorderPx === 0) {
        return { input: fittedPoster, top, left };
      }

      // Build a black canvas the size of the inner frame, paste the poster
      // inset by extraBorderPx — the visible black ring sits between the
      // resized poster and the photo's own frame edge, effectively
      // thickening the frame border in the rendered output.
      const bordered = await sharp({
        create: {
          width: w,
          height: h,
          channels: 3,
          background: FRAME_BLACK,
        },
      })
        .composite([
          { input: fittedPoster, top: extraBorderPx, left: extraBorderPx },
        ])
        .png()
        .toBuffer();
      return { input: bordered, top, left };
    }),
  );

  return sharp(plate)
    .composite(composites)
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
}

// ---------- Living-room triptych orchestration ----------

/**
 * Build (or rebuild) the living-room triptych mockup variants for a
 * single poster. One variant is produced for each sibling pair (up to
 * three). The resulting storage keys are written to the poster row's
 * `livingRoomMockupKeys` JSON field.
 *
 * Called from:
 *   - the upload server actions, after a new poster row is inserted;
 *   - the per-poster "Regenerate previews & mockups" admin button;
 *   - the bulk backfill route + the standalone backfill script.
 *
 * Returns the new array of storage keys (which is also persisted on
 * the poster). May return an empty array if the poster has fewer than
 * two siblings in its gallery — that's a valid state and the page
 * falls back to a placeholder for that slot.
 */
export async function refreshLivingRoomMockups(
  posterId: string,
): Promise<string[]> {
  const target = await prisma.poster.findUnique({
    where: { id: posterId },
    select: { previewKey: true, thumbnailKey: true, masterKey: true },
  });
  if (!target) {
    throw new Error(`refreshLivingRoomMockups: poster ${posterId} not found`);
  }

  // Prefer the watermarked preview; fall back to the thumbnail or master
  // so a poster with a missing preview still gets a mockup.
  const mainKey = target.previewKey ?? target.thumbnailKey ?? target.masterKey;
  const mainBuffer = await readBuffer(mainKey);

  const pairs = await getSiblingPairsForPoster(posterId);

  const newKeys: string[] = [];
  for (const [left, right] of pairs) {
    const leftKey = left.previewKey ?? left.thumbnailKey ?? left.masterKey;
    const rightKey = right.previewKey ?? right.thumbnailKey ?? right.masterKey;
    const [leftBuf, rightBuf] = await Promise.all([
      readBuffer(leftKey),
      readBuffer(rightKey),
    ]);
    const variant = await buildLivingRoomMockup(mainBuffer, leftBuf, rightBuf);
    const key = await putBuffer('mockups', variant, 'jpg');
    newKeys.push(key);
  }

  await prisma.poster.update({
    where: { id: posterId },
    data: { livingRoomMockupKeys: newKeys },
  });

  return newKeys;
}
