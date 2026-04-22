// Storage abstraction.
// Today: Railway persistent volume in production, local ./uploads in dev.
// Tomorrow (v2+): Cloudflare R2 / S3 — swap the adapter, callers don't change.
//
// Storage keys are opaque strings like "masters/2026-04/xyz.png".
// The seed file uses a "public:<path>" prefix for legacy public-bucket images
// that still live in public/posters/ during development.

import { promises as fs } from 'fs';
import { createReadStream } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const ROOT =
  process.env.STORAGE_ROOT ??
  (process.env.NODE_ENV === 'production' ? '/data/linework' : path.join(process.cwd(), 'uploads'));

export type StorageKind = 'masters' | 'previews' | 'thumbnails' | 'mockups';

/**
 * Save a buffer under a derived, collision-free key.
 * The key is what we persist in the DB.
 */
export async function putBuffer(
  kind: StorageKind,
  buffer: Buffer,
  ext: string,
): Promise<string> {
  const month = new Date().toISOString().slice(0, 7); // "2026-04"
  const key = `${kind}/${month}/${randomUUID()}.${ext.replace(/^\./, '')}`;
  const full = path.join(ROOT, key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, buffer);
  return key;
}

/**
 * Resolve a key to an absolute path on disk.
 * Throws if the key isn't backed by the volume (e.g. "public:" seed keys).
 */
export function resolveKey(key: string): string {
  if (key.startsWith('public:')) {
    throw new Error('resolveKey called with public: key; use publicUrl instead');
  }
  return path.join(ROOT, key);
}

/**
 * Public URL for an image. For volume-backed keys this hits our Next.js
 * streaming route; for legacy "public:" keys it hits /posters/... directly.
 * Session 4 will bifurcate this into signed-URL vs unsigned for masters.
 */
export function publicUrl(key: string | null | undefined): string {
  if (!key) return '';
  if (key.startsWith('public:')) {
    // public:/posters/big-ben.png  →  /posters/big-ben.png
    return key.slice('public:'.length);
  }
  // Volume-backed — stream via our app route
  return `/api/storage/${encodeURI(key)}`;
}

export function isPublicKey(key: string): boolean {
  return key.startsWith('public:');
}

/**
 * Read a volume-backed file into a buffer.
 * Only used by the /api/storage streaming handler and internal pipelines.
 */
export async function readBuffer(key: string): Promise<Buffer> {
  if (key.startsWith('public:')) {
    const relative = key.slice('public:'.length).replace(/^\//, '');
    return fs.readFile(path.join(process.cwd(), 'public', relative));
  }
  return fs.readFile(resolveKey(key));
}

/**
 * Return a read stream for streaming responses.
 */
export function readStream(key: string) {
  if (key.startsWith('public:')) {
    const relative = key.slice('public:'.length).replace(/^\//, '');
    return createReadStream(path.join(process.cwd(), 'public', relative));
  }
  return createReadStream(resolveKey(key));
}

/**
 * Ensure the storage root exists (called at startup for dev convenience).
 */
export async function ensureStorageRoot(): Promise<void> {
  await fs.mkdir(ROOT, { recursive: true });
}

export const STORAGE_ROOT = ROOT;
