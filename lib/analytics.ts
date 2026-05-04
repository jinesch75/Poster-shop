// Privacy-first analytics helpers.
//
// Recorder + query layer over the PageView model. The recorder is
// called from /api/track (Node runtime) — never from the Edge
// middleware, which can't talk to Prisma. The query helpers are used
// by /admin/analytics.
//
// What we DO store:
//   - URL path, referrer host, country, device/browser/os, daily session hash
// What we DO NOT store:
//   - IP addresses (only used transiently to compute the hash + geo lookup)
//   - cookies or any persistent client identifier
//   - URL query strings or search params
//   - user names, emails, or any account-bound data

import { createHash, randomBytes } from 'crypto';
import { prisma } from './prisma';

// ---------- Session hashing ----------

// Daily salt — regenerated whenever the process boots on a new UTC day.
// We don't persist it: that's the whole point. Each day a fresh salt
// means yesterday's hashes can't be re-derived from today's traffic.
let saltDate = '';
let salt = '';
function dailySalt(): string {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  if (today !== saltDate) {
    saltDate = today;
    // 32 random bytes mixed with the date — even within the same UTC
    // day, multiple Railway replicas land on different salts, but
    // visitor counts are still useful directionally.
    salt = randomBytes(32).toString('hex') + ':' + today;
  }
  return salt;
}

export function hashSession(ip: string, userAgent: string): string {
  return createHash('sha256')
    .update(dailySalt())
    .update('|')
    .update(ip)
    .update('|')
    .update(userAgent)
    .digest('hex')
    .slice(0, 32); // truncate — full sha256 is overkill for this
}

// ---------- User-agent parsing ----------

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'bot';

const BOT_MARKERS = [
  'bot', 'crawl', 'spider', 'slurp', 'googlebot', 'bingbot', 'duckduckbot',
  'baiduspider', 'yandexbot', 'sogou', 'facebot', 'ia_archiver',
  'semrush', 'ahrefs', 'mj12', 'dotbot', 'petalbot', 'applebot',
  'headlesschrome', 'phantomjs', 'puppeteer', 'playwright', 'curl', 'wget',
  'python-requests', 'go-http-client', 'node-fetch', 'okhttp',
];

export function parseUserAgent(ua: string): {
  deviceType: DeviceType;
  browser: string;
  os: string;
  isBot: boolean;
} {
  const lower = ua.toLowerCase();

  const isBot = BOT_MARKERS.some((m) => lower.includes(m));
  if (isBot) {
    return { deviceType: 'bot', browser: 'bot', os: 'bot', isBot: true };
  }

  let deviceType: DeviceType = 'desktop';
  if (/ipad|tablet/.test(lower) && !/mobile/.test(lower)) deviceType = 'tablet';
  else if (/mobi|android.*mobile|iphone|ipod/.test(lower)) deviceType = 'mobile';

  let browser = 'other';
  if (/edg\//.test(lower)) browser = 'edge';
  else if (/chrome\//.test(lower) && !/edg\//.test(lower)) browser = 'chrome';
  else if (/firefox\//.test(lower)) browser = 'firefox';
  else if (/safari\//.test(lower) && !/chrome\//.test(lower)) browser = 'safari';
  else if (/opr\//.test(lower) || /opera/.test(lower)) browser = 'opera';

  let os = 'other';
  if (/iphone|ipad|ipod|ios/.test(lower)) os = 'iOS';
  else if (/android/.test(lower)) os = 'Android';
  else if (/mac os x|macintosh/.test(lower)) os = 'macOS';
  else if (/windows/.test(lower)) os = 'Windows';
  else if (/linux/.test(lower)) os = 'Linux';

  return { deviceType, browser, os, isBot: false };
}

// ---------- Referrer normalization ----------

export function normalizeReferrer(raw: string | null | undefined, ownHost: string | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    // Skip self-referrals — they just clutter the "where they came from" report.
    if (ownHost && host === ownHost.toLowerCase().replace(/^www\./, '')) return null;
    return host;
  } catch {
    return null;
  }
}

// ---------- Country lookup ----------
//
// Free, no-API-key country lookup. We hit api.country.is which returns
// `{ ip, country }` — country is ISO-2 (e.g. "FR"). Failures resolve to
// null; tracking never blocks on geo.
//
// In a future iteration we could swap this for a self-hosted MaxMind
// lookup, but the free service is plenty for a small shop and avoids
// shipping a 60MB binary database.

const geoCache = new Map<string, { country: string | null; expiresAt: number }>();
const GEO_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function lookupCountry(ip: string): Promise<string | null> {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('10.') || ip.startsWith('192.168.')) {
    return null;
  }
  const cached = geoCache.get(ip);
  if (cached && cached.expiresAt > Date.now()) return cached.country;

  try {
    const res = await fetch(`https://api.country.is/${encodeURIComponent(ip)}`, {
      // 1.5s ceiling — geo lookup must never delay tracking writes.
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) {
      geoCache.set(ip, { country: null, expiresAt: Date.now() + GEO_TTL_MS });
      return null;
    }
    const data = (await res.json()) as { country?: string };
    const country = data.country?.toUpperCase() ?? null;
    geoCache.set(ip, { country, expiresAt: Date.now() + GEO_TTL_MS });
    return country;
  } catch {
    geoCache.set(ip, { country: null, expiresAt: Date.now() + GEO_TTL_MS });
    return null;
  }
}

// ---------- Recorder ----------

export type RecordPageViewInput = {
  path: string;
  referrer: string | null;
  ip: string;
  userAgent: string;
  ownHost: string | null;
};

export async function recordPageView(input: RecordPageViewInput): Promise<void> {
  // Strip query strings + fragments — keep paths clean for aggregation.
  const path = input.path.split('?')[0].split('#')[0] || '/';

  // Filter out obvious non-page paths just in case middleware lets one through.
  if (
    path.startsWith('/api/') ||
    path.startsWith('/_next/') ||
    path.startsWith('/admin') ||
    path === '/favicon.ico' ||
    path === '/robots.txt' ||
    path === '/sitemap.xml' ||
    path.match(/\.(png|jpe?g|gif|svg|webp|ico|css|js|map|txt|xml|json)$/i)
  ) {
    return;
  }

  const ua = parseUserAgent(input.userAgent || '');
  if (ua.isBot) return; // don't record crawler hits

  const referrer = normalizeReferrer(input.referrer, input.ownHost);
  const country = await lookupCountry(input.ip);
  const sessionHash = hashSession(input.ip, input.userAgent || '');

  await prisma.pageView.create({
    data: {
      path,
      referrer,
      country,
      deviceType: ua.deviceType,
      browser: ua.browser,
      os: ua.os,
      sessionHash,
    },
  });
}

// ---------- Query layer ----------

export type DateRange = { from: Date; to: Date };

export function rangeFromKey(key: '24h' | '7d' | '30d' | '90d'): DateRange {
  const to = new Date();
  const from = new Date(to);
  switch (key) {
    case '24h': from.setHours(from.getHours() - 24); break;
    case '7d':  from.setDate(from.getDate() - 7);    break;
    case '30d': from.setDate(from.getDate() - 30);   break;
    case '90d': from.setDate(from.getDate() - 90);   break;
  }
  return { from, to };
}

export async function getOverview(range: DateRange) {
  const where = { createdAt: { gte: range.from, lte: range.to } };

  const [pageViews, sessions] = await Promise.all([
    prisma.pageView.count({ where }),
    prisma.pageView.findMany({
      where,
      distinct: ['sessionHash'],
      select: { sessionHash: true },
    }),
  ]);

  return {
    pageViews,
    visitors: sessions.length,
  };
}

// Convenience wrapper for the admin overview "Visitors (7d)" tile.
export async function getVisitorsLastNDays(days: number): Promise<number> {
  const from = new Date();
  from.setDate(from.getDate() - days);
  const sessions = await prisma.pageView.findMany({
    where: { createdAt: { gte: from } },
    distinct: ['sessionHash'],
    select: { sessionHash: true },
  });
  return sessions.length;
}

export async function getTopPages(range: DateRange, limit = 10) {
  const grouped = await prisma.pageView.groupBy({
    by: ['path'],
    where: { createdAt: { gte: range.from, lte: range.to } },
    _count: { _all: true },
    orderBy: { _count: { path: 'desc' } },
    take: limit,
  });
  return grouped.map((g) => ({ path: g.path, views: g._count._all }));
}

export async function getTopCountries(range: DateRange, limit = 10) {
  const grouped = await prisma.pageView.groupBy({
    by: ['country'],
    where: { createdAt: { gte: range.from, lte: range.to }, country: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { country: 'desc' } },
    take: limit,
  });
  return grouped.map((g) => ({ country: g.country!, views: g._count._all }));
}

export async function getTopReferrers(range: DateRange, limit = 10) {
  const grouped = await prisma.pageView.groupBy({
    by: ['referrer'],
    where: { createdAt: { gte: range.from, lte: range.to }, referrer: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { referrer: 'desc' } },
    take: limit,
  });
  return grouped.map((g) => ({ referrer: g.referrer!, views: g._count._all }));
}

export async function getDeviceBreakdown(range: DateRange) {
  const grouped = await prisma.pageView.groupBy({
    by: ['deviceType'],
    where: { createdAt: { gte: range.from, lte: range.to } },
    _count: { _all: true },
  });
  const total = grouped.reduce((s, g) => s + g._count._all, 0) || 1;
  return grouped
    .map((g) => ({
      device: g.deviceType ?? 'unknown',
      views: g._count._all,
      percent: Math.round((g._count._all / total) * 100),
    }))
    .sort((a, b) => b.views - a.views);
}

export async function getBrowserBreakdown(range: DateRange) {
  const grouped = await prisma.pageView.groupBy({
    by: ['browser'],
    where: { createdAt: { gte: range.from, lte: range.to } },
    _count: { _all: true },
  });
  const total = grouped.reduce((s, g) => s + g._count._all, 0) || 1;
  return grouped
    .map((g) => ({
      browser: g.browser ?? 'unknown',
      views: g._count._all,
      percent: Math.round((g._count._all / total) * 100),
    }))
    .sort((a, b) => b.views - a.views);
}

// Daily traffic series for the chart. Returns one entry per day in the
// range (zero-filled), with `views` and `visitors` (unique sessionHash
// count) per day. Computed in JS rather than SQL groupBy to keep this
// portable across Postgres versions and to support unique-session
// counting cleanly.
export async function getDailyTraffic(range: DateRange): Promise<
  Array<{ date: string; views: number; visitors: number }>
> {
  const rows = await prisma.pageView.findMany({
    where: { createdAt: { gte: range.from, lte: range.to } },
    select: { createdAt: true, sessionHash: true },
  });

  const buckets = new Map<string, { views: number; sessions: Set<string> }>();
  for (const r of rows) {
    const day = r.createdAt.toISOString().slice(0, 10);
    let b = buckets.get(day);
    if (!b) {
      b = { views: 0, sessions: new Set() };
      buckets.set(day, b);
    }
    b.views += 1;
    b.sessions.add(r.sessionHash);
  }

  const out: Array<{ date: string; views: number; visitors: number }> = [];
  const cursor = new Date(range.from);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(range.to);
  end.setUTCHours(0, 0, 0, 0);
  while (cursor.getTime() <= end.getTime()) {
    const day = cursor.toISOString().slice(0, 10);
    const b = buckets.get(day);
    out.push({ date: day, views: b?.views ?? 0, visitors: b?.sessions.size ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}
