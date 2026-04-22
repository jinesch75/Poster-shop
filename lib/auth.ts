// Admin-only auth for Session 2. Simple: one password in env,
// signed JWT cookie on success, middleware checks it on /admin/*.
// Session 4 will introduce Auth.js magic-link for customers; admin
// can join that flow at that point.
//
// IMPORTANT: middleware.ts runs on the Edge runtime which can't use
// bcrypt or Node crypto primitives. `jose` works on Edge — we use it
// for both signing and verification.

import { SignJWT, jwtVerify } from 'jose';

const COOKIE_NAME = 'linework_admin';
const ALG = 'HS256';

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET is not set');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Constant-time password check. `process.env.ADMIN_PASSWORD` must be set.
 */
export function verifyAdminPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  if (candidate.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= expected.charCodeAt(i) ^ candidate.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function signAdminToken(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey());
}

export async function verifyAdminToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: [ALG] });
    return payload.role === 'admin';
  } catch {
    return false;
  }
}

export const ADMIN_COOKIE = COOKIE_NAME;
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
