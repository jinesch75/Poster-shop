// Watermark + derivative pipeline.
//
// One master file in → master + preview + thumbnail + office mockup out.
// (The living-room triptych mockup needs sibling posters and is built by
// a separate function — see refreshLivingRoomMockups in step 4.)
//
// Strategy: resolution is the protection. The clean 4000px+ master stays
// private, served only via signed download URLs after purchase. The public
// 1200px preview is gorgeous on screen but useless for printing at any
// meaningful size — at 300dpi it tops out around postcard size. The
// thumbnail is even smaller (500px) for grid display.
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

// ---------- Asset dimensions ----------

/** Public preview: large enough to look great on a 4K screen, too small to print well. */
const PREVIEW_TARGET_WIDTH = 1200;

/** Public thumbnail: grid display only. */
const THUMB_TARGET_WIDTH = 500;

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
  const previewBuffer = await sharp(masterBuffer)
    .resize({ width: previewWidth, withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  const previewKey = await putBuffer('previews', previewBuffer, 'jpg');

  // ---- Thumbnail (500px) --------------------------------------------
  const thumbWidth = Math.min(THUMB_TARGET_WIDTH, width);
  const thumbBuffer = await sharp(masterBuffer)
    .resize({ width: thumbWidth, withoutEnlargement: true })
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
  return compositeIntoFrames(plate, [
    { posterBuffer: siblingLeft, frame: sidecar.frames[0] },
    { posterBuffer: mainPoster, frame: sidecar.frames[1] },
    { posterBuffer: siblingRight, frame: sidecar.frames[2] },
  ]);
}

async function compositeIntoFrames(
  plate: Buffer,
  slots: Array<{ posterBuffer: Buffer; frame: FrameSlot }>,
): Promise<Buffer> {
  // Both scenes are square-on photos, so the inner rectangles are
  // axis-aligned. A cover-resize + rectangular composite reproduces what
  // the eye expects without needing a perspective transform. The aspect
  // mismatch (poster 3:4 vs frame ~7:10) is absorbed by `fit: 'cover'`,
  // which crops a small sliver from the poster's top/bottom rather than
  // letterboxing or stretching.
  const composites = await Promise.all(
    slots.map(async ({ posterBuffer, frame }) => {
      const left = frame.innerTopLeft[0];
      const top = frame.innerTopLeft[1];
      const w = frame.innerTopRight[0] - frame.innerTopLeft[0];
      const h = frame.innerBottomLeft[1] - frame.innerTopLeft[1];
      const fitted = await sharp(posterBuffer)
        .resize(w, h, { fit: 'cover', position: 'center' })
        .toBuffer();
      return { input: fitted, top, left };
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
