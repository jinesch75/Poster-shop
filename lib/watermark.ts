// Watermark + derivative pipeline.
//
// One master file in → master + preview + thumbnail + two mockups out.
//
// Strategy (rebuilt 2026-04-26): resolution is the protection. The clean
// 4000px+ master stays private, served only via signed download URLs after
// purchase. The public 1200px preview is gorgeous on screen but useless for
// printing at any meaningful size — at 300dpi it tops out around postcard
// size. A tiny QR code in the bottom-right corner points back at our site
// (`/q/<slug>` → server-side redirect), so any leaked image becomes a
// scannable advert. The thumbnail is even smaller (500px) and mark-free.

import sharp from 'sharp';
import path from 'path';
import { promises as fs } from 'fs';
import { putBuffer, readBuffer } from './storage';
import { qrPngBuffer, qrTargetUrl } from './qr';

// ---------- Asset dimensions ----------

/** Public preview: large enough to look great on a 4K screen, too small to print well. */
const PREVIEW_TARGET_WIDTH = 1200;

/** Public thumbnail: grid display only. */
const THUMB_TARGET_WIDTH = 500;

/** QR stamp size as a fraction of the preview's actual width. */
const QR_FRACTION_OF_WIDTH = 0.085;

/** Inner white pill padding around the QR (each side, in QR pixels). */
const QR_PILL_PADDING = 8;

/** Distance from the preview edge to the QR pill (each side, as a fraction of preview width). */
const QR_EDGE_INSET_FRACTION = 0.022;

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
 * @param slug         poster slug — baked into the QR code as `/q/<slug>`
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
  slug: string,
  masterKey: string,
): Promise<PosterDerivatives> {
  const meta = await sharp(masterBuffer).metadata();
  const width = meta.width ?? 1856;
  const height = meta.height ?? 2464;

  // ---- Preview (1200px + QR) ----------------------------------------
  // Cap target width at the master's actual width so we never upscale
  // (sharp errors with "Image to composite must have same dimensions
  // or smaller" if we try to overlay something bigger than the source).
  const previewWidth = Math.min(PREVIEW_TARGET_WIDTH, width);
  const previewHeight = Math.round((height / width) * previewWidth);

  // Render the QR as a real PNG buffer at the target stamp size.
  // We then frame it in a soft-white rounded "pill" so it scans even
  // when it lands on top of one of the dark Mondrian colour blocks.
  const qrSize = Math.round(previewWidth * QR_FRACTION_OF_WIDTH);
  const qrPng = await qrPngBuffer(qrTargetUrl(slug), qrSize);
  const qrBadge = await buildQrBadge(qrPng, qrSize);
  const badgeSize = qrSize + QR_PILL_PADDING * 2;
  const inset = Math.round(previewWidth * QR_EDGE_INSET_FRACTION);

  const previewBuffer = await sharp(masterBuffer)
    .resize({ width: previewWidth, withoutEnlargement: true })
    .composite([
      {
        input: qrBadge,
        top: previewHeight - badgeSize - inset,
        left: previewWidth - badgeSize - inset,
      },
    ])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  const previewKey = await putBuffer('previews', previewBuffer, 'jpg');

  // ---- Thumbnail (500px, clean) -------------------------------------
  // No QR on the thumbnail — at 500px wide a QR would be illegible
  // anyway, and the grid card is small enough that the QR-on-preview
  // is the public-facing scannable copy.
  const thumbWidth = Math.min(THUMB_TARGET_WIDTH, width);
  const thumbBuffer = await sharp(masterBuffer)
    .resize({ width: thumbWidth, withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  const thumbnailKey = await putBuffer('thumbnails', thumbBuffer, 'jpg');

  // ---- Mockups -------------------------------------------------------
  // Mockups composite the clean preview onto a room plate. The preview
  // already carries the QR badge so the mockup gets it for free in the
  // bottom-right of the framed poster.
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

// ---------- QR badge ----------

/**
 * Wrap a black-on-white QR PNG in a rounded "pill" so it visually
 * detaches from the artwork and scans reliably on any background.
 */
async function buildQrBadge(qrPng: Buffer, qrSize: number): Promise<Buffer> {
  const totalSize = qrSize + QR_PILL_PADDING * 2;
  const radius = Math.round(QR_PILL_PADDING * 0.6);
  const pillSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${totalSize}" height="${totalSize}">
      <rect x="0" y="0" width="${totalSize}" height="${totalSize}"
            rx="${radius}" ry="${radius}"
            fill="#ffffff" fill-opacity="0.94"/>
    </svg>`;
  return sharp(Buffer.from(pillSvg))
    .composite([{ input: qrPng, top: QR_PILL_PADDING, left: QR_PILL_PADDING }])
    .png()
    .toBuffer();
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
