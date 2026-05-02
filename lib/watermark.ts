// Watermark + derivative pipeline.
//
// One master file in → master + preview + thumbnail + two mockups out.
//
// Strategy: resolution is the protection. The clean 4000px+ master stays
// private, served only via signed download URLs after purchase. The public
// 1200px preview is gorgeous on screen but useless for printing at any
// meaningful size — at 300dpi it tops out around postcard size. The
// thumbnail is even smaller (500px) for grid display.
//
// Note (2026-05-02): the QR-badge stamp on the preview was removed.
// The /q/<slug> redirect endpoint, the QrScan model, and lib/qr.ts are
// retained so QR stamping can be reintroduced later without rewiring.

import sharp from 'sharp';
import path from 'path';
import { promises as fs } from 'fs';
import { putBuffer, readBuffer } from './storage';

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
  mockupLivingKey: string;
  widthPx: number;
  heightPx: number;
};

// ---------- Pipeline ----------

/**
 * Run the full pipeline: write master + generate three public derivatives
 * + two mockups. Returns storage keys for all of them.
 *
 * @param masterBuffer raw bytes of the uploaded master file (PNG/JPG)
 * @param slug         poster slug — currently unused inside the pipeline,
 *                     retained on the public API so QR stamping (which
 *                     bakes `/q/<slug>` into the preview) can be turned
 *                     back on later without changing call sites.
 * @param ext          original master extension (informs the master file's stored ext)
 */
export async function processMaster(
  masterBuffer: Buffer,
  slug: string,
  ext: 'png' | 'jpg' = 'png',
): Promise<PosterDerivatives> {
  // Master — untouched, written to private volume storage.
  const masterKey = await putBuffer('masters', masterBuffer, ext);

  return runDerivatives(masterBuffer, slug, masterKey);
}

/**
 * Rebuild derivatives from an already-uploaded master.
 *
 * Used by the per-poster "Regenerate previews & mockups" admin button and
 * by the bulk backfill route.
 */
export async function reprocessMaster(
  masterKey: string,
  slug: string,
): Promise<PosterDerivatives> {
  const buffer = await readBuffer(masterKey);
  return runDerivatives(buffer, slug, masterKey);
}

// ---------- Internal: derivative generation ----------

async function runDerivatives(
  masterBuffer: Buffer,
  _slug: string,
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

  // ---- Mockups -------------------------------------------------------
  // Mockups composite the preview onto a room plate.
  const mockupOfficeBuffer = await buildMockup(previewBuffer, previewWidth, previewHeight, 'office');
  const mockupLivingBuffer = await buildMockup(previewBuffer, previewWidth, previewHeight, 'living');
  const mockupOfficeKey = await putBuffer('mockups', mockupOfficeBuffer, 'jpg');
  const mockupLivingKey = await putBuffer('mockups', mockupLivingBuffer, 'jpg');

  return {
    masterKey,
    previewKey,
    thumbnailKey,
    mockupOfficeKey,
    mockupLivingKey,
    widthPx: width,
    heightPx: height,
  };
}

// ---------- Mockup composition ----------

async function buildMockup(
  posterBuffer: Buffer,
  posterW: number,
  posterH: number,
  scene: 'office' | 'living',
): Promise<Buffer> {
  // Output mockup is 1600 × 1100 landscape.
  const sceneW = 1600;
  const sceneH = 1100;

  // Scale the poster so its height fills ~55% of the scene height.
  const targetH = Math.round(sceneH * 0.55);
  const targetW = Math.round((posterW / posterH) * targetH);

  const scaledPoster = await sharp(posterBuffer)
    .resize({ width: targetW, height: targetH, fit: 'inside' })
    .png()
    .toBuffer();

  // Frame it with a thin off-white mat.
  const matPadding = 18;
  const framedW = targetW + matPadding * 2;
  const framedH = targetH + matPadding * 2;
  const frameSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${framedW}" height="${framedH}">
      <rect width="100%" height="100%" fill="#faf7f0" />
      <rect x="2" y="2" width="${framedW - 4}" height="${framedH - 4}"
            fill="none" stroke="#1a1a1a" stroke-opacity="0.18" stroke-width="1"/>
    </svg>`;
  const framed = await sharp(Buffer.from(frameSvg))
    .composite([{ input: scaledPoster, top: matPadding, left: matPadding }])
    .png()
    .toBuffer();

  // Load the scene plate if present; otherwise synthesise one.
  const platePath = path.join(process.cwd(), 'public', 'mockups', `${scene}.jpg`);
  let plate: Buffer;
  try {
    plate = await fs.readFile(platePath);
    plate = await sharp(plate).resize(sceneW, sceneH, { fit: 'cover' }).toBuffer();
  } catch {
    plate = await sharp({
      create: {
        width: sceneW,
        height: sceneH,
        channels: 3,
        background: scene === 'office' ? { r: 237, g: 232, b: 221 } : { r: 228, g: 220, b: 208 },
      },
    })
      .jpeg()
      .toBuffer();
  }

  // Place the framed poster slightly left of centre, slightly above mid-line.
  const left = Math.round((sceneW - framedW) / 2) - (scene === 'office' ? 60 : 0);
  const top = Math.round((sceneH - framedH) / 2) - 40;

  return sharp(plate)
    .composite([{ input: framed, top, left }])
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
}
