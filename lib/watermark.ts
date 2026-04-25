// Watermark + derivative pipeline.
// One master file in → master + preview + thumbnail + two mockups out.
// All overlays are generated as SVG so the wordmark stays vector-crisp
// at any scale — no bitmap logo needed in v1.

import sharp from 'sharp';
import { putBuffer, readBuffer } from './storage';
import path from 'path';
import { promises as fs } from 'fs';

const BRAND_TEXT = 'LINEWORK · STUDIO';

// ---------- SVG overlay generators ----------

function diagonalWordmarkSvg(width: number, height: number): string {
  // A repeating diagonal band of "LINEWORK · STUDIO" at ~15% opacity.
  // Font size scales with the image; keep letter-spacing generous.
  const fontSize = Math.round(Math.min(width, height) * 0.045);
  const gap = fontSize * 5.5;
  // Build enough rows to cover the diagonal.
  const rows: string[] = [];
  const count = Math.ceil((width + height) / gap) + 2;
  for (let i = -count; i < count; i += 1) {
    const y = i * gap + height / 2;
    rows.push(
      `<text x="${width / 2}" y="${y}" text-anchor="middle" ` +
        `font-family="Outfit, Inter, Helvetica, Arial, sans-serif" ` +
        `font-size="${fontSize}" font-weight="300" ` +
        `letter-spacing="${fontSize * 0.35}" ` +
        `fill="#1a1a1a" fill-opacity="0.12">` +
        `${BRAND_TEXT}</text>`,
    );
  }
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <g transform="rotate(-28 ${width / 2} ${height / 2})">
        ${rows.join('\n')}
      </g>
    </svg>
  `.trim();
}

function cornerWordmarkSvg(width: number, height: number): string {
  // Small corner mark — bottom right, the same two-weight wordmark as the UI.
  const fontSize = Math.round(Math.min(width, height) * 0.022);
  const padX = Math.round(width * 0.035);
  const padY = Math.round(height * 0.03);
  const x = width - padX;
  const y = height - padY;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <g text-anchor="end" font-family="Outfit, Inter, Helvetica, Arial, sans-serif"
         font-size="${fontSize}" fill="#1a1a1a" fill-opacity="0.55">
        <text x="${x}" y="${y}" font-weight="600" letter-spacing="${fontSize * 0.08}">
          Linework<tspan font-weight="300" fill-opacity="0.35"> Studio</tspan>
        </text>
      </g>
    </svg>
  `.trim();
}

// ---------- Generators ----------

export type PosterDerivatives = {
  masterKey: string;
  previewKey: string;
  thumbnailKey: string;
  mockupOfficeKey: string;
  mockupLivingKey: string;
  widthPx: number;
  heightPx: number;
};

/**
 * Run the full pipeline: write master + generate three public derivatives
 * + two mockups. Returns storage keys for all of them.
 *
 * masterBuffer: raw bytes of the uploaded master file (PNG/JPG).
 */
export async function processMaster(
  masterBuffer: Buffer,
  ext: 'png' | 'jpg' = 'png',
): Promise<PosterDerivatives> {
  // Master — untouched, private bucket.
  const masterKey = await putBuffer('masters', masterBuffer, ext);

  const meta = await sharp(masterBuffer).metadata();
  const width = meta.width ?? 1856;
  const height = meta.height ?? 2464;

  // Preview — large, with diagonal wordmark + corner mark.
  // Cap target width at the master's actual width so we never try to
  // composite an SVG overlay that's larger than the base image
  // (sharp errors with "Image to composite must have same dimensions or smaller").
  const previewWidth = Math.min(2400, width);
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

  // Thumbnail — small, corner mark only. Same defensive cap as preview.
  const thumbWidth = Math.min(800, width);
  const thumbHeight = Math.round((height / width) * thumbWidth);
  const thumbBuffer = await sharp(masterBuffer)
    .resize({ width: thumbWidth, withoutEnlargement: true })
    .composite([
      { input: Buffer.from(cornerWordmarkSvg(thumbWidth, thumbHeight)), top: 0, left: 0 },
    ])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  const thumbnailKey = await putBuffer('thumbnails', thumbBuffer, 'jpg');

  // Mockups — composited onto neutral room plates.
  // The plates live in public/mockups/. If a plate is missing, we fall back
  // to a softly shaded room generated from SVG so the pipeline never fails
  // hard on a fresh install.
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

/**
 * Rebuild derivatives from an already-uploaded master. Useful if the
 * watermark style changes and we need to regenerate for every poster.
 */
export async function reprocessMaster(masterKey: string): Promise<PosterDerivatives> {
  const ext = (path.extname(masterKey).replace(/^\./, '') || 'png') as 'png' | 'jpg';
  const buffer = await readBuffer(masterKey);
  // processMaster writes a NEW master key; for reprocess we keep the existing
  // master and only regenerate derivatives. Inline the relevant bits:
  const meta = await sharp(buffer).metadata();
  const width = meta.width ?? 1856;
  const height = meta.height ?? 2464;

  const previewWidth = Math.min(2400, width);
  const previewHeight = Math.round((height / width) * previewWidth);
  const previewBuffer = await sharp(buffer)
    .resize({ width: previewWidth, withoutEnlargement: true })
    .composite([
      { input: Buffer.from(diagonalWordmarkSvg(previewWidth, previewHeight)), top: 0, left: 0 },
      { input: Buffer.from(cornerWordmarkSvg(previewWidth, previewHeight)), top: 0, left: 0 },
    ])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  const previewKey = await putBuffer('previews', previewBuffer, 'jpg');

  const thumbWidth = Math.min(800, width);
  const thumbHeight = Math.round((height / width) * thumbWidth);
  const thumbBuffer = await sharp(buffer)
    .resize({ width: thumbWidth, withoutEnlargement: true })
    .composite([
      { input: Buffer.from(cornerWordmarkSvg(thumbWidth, thumbHeight)), top: 0, left: 0 },
    ])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  const thumbnailKey = await putBuffer('thumbnails', thumbBuffer, 'jpg');

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

