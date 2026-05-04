// Admin analytics dashboard.
//
// Privacy-first traffic stats sourced from PageView (lib/analytics).
// Date range selectable via the `range` search param: 24h | 7d | 30d | 90d.
// All charts are inline SVG — no client-side chart libraries.

import Link from 'next/link';
import {
  getOverview,
  getTopPages,
  getTopCountries,
  getTopReferrers,
  getDeviceBreakdown,
  getBrowserBreakdown,
  getDailyTraffic,
  rangeFromKey,
} from '@/lib/analytics';

export const dynamic = 'force-dynamic';

type RangeKey = '24h' | '7d' | '30d' | '90d';
const RANGE_LABELS: Record<RangeKey, string> = {
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
};

function isRangeKey(v: string | undefined): v is RangeKey {
  return v === '24h' || v === '7d' || v === '30d' || v === '90d';
}

// ISO-2 → flag emoji. Pure unicode trick: ASCII A–Z → regional indicators.
function flag(country: string): string {
  if (country.length !== 2) return '';
  const A = 0x1f1e6;
  return String.fromCodePoint(
    A + country.charCodeAt(0) - 65,
    A + country.charCodeAt(1) - 65,
  );
}

// Best-effort country name table for the top entries we expect to see.
// Falls back to the ISO code if not in the map.
const COUNTRY_NAMES: Record<string, string> = {
  LU: 'Luxembourg', FR: 'France', DE: 'Germany', BE: 'Belgium', NL: 'Netherlands',
  GB: 'United Kingdom', IE: 'Ireland', ES: 'Spain', IT: 'Italy', PT: 'Portugal',
  CH: 'Switzerland', AT: 'Austria', SE: 'Sweden', NO: 'Norway', DK: 'Denmark',
  FI: 'Finland', PL: 'Poland', CZ: 'Czech Republic', GR: 'Greece',
  US: 'United States', CA: 'Canada', MX: 'Mexico', BR: 'Brazil',
  JP: 'Japan', CN: 'China', KR: 'South Korea', IN: 'India',
  AU: 'Australia', NZ: 'New Zealand', ZA: 'South Africa',
};

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const rangeKey: RangeKey = isRangeKey(sp.range) ? sp.range : '7d';
  const range = rangeFromKey(rangeKey);

  const [overview, daily, topPages, topCountries, topReferrers, devices, browsers] =
    await Promise.all([
      getOverview(range),
      getDailyTraffic(range),
      getTopPages(range, 10),
      getTopCountries(range, 10),
      getTopReferrers(range, 10),
      getDeviceBreakdown(range),
      getBrowserBreakdown(range),
    ]);

  const viewsPerVisitor =
    overview.visitors === 0 ? 0 : overview.pageViews / overview.visitors;

  return (
    <div className="admin-dash">
      <header className="admin-dash__header">
        <p className="admin-dash__eyebrow">Insights</p>
        <h1>Analytics</h1>
        <p className="admin-dash__lede">
          Privacy-first visitor stats. No cookies, no IP storage —
          counts are based on a daily-rotating anonymous hash.
        </p>
      </header>

      <div className="admin-analytics__rangebar">
        {(Object.keys(RANGE_LABELS) as RangeKey[]).map((k) => (
          <Link
            key={k}
            href={`/admin/analytics?range=${k}`}
            className={
              'admin-analytics__rangelink' +
              (k === rangeKey ? ' admin-analytics__rangelink--active' : '')
            }
          >
            {RANGE_LABELS[k]}
          </Link>
        ))}
      </div>

      <div className="admin-stats">
        <Stat label="Visitors" value={overview.visitors.toLocaleString()} note={RANGE_LABELS[rangeKey]} />
        <Stat label="Page views" value={overview.pageViews.toLocaleString()} note={RANGE_LABELS[rangeKey]} />
        <Stat
          label="Views / visitor"
          value={viewsPerVisitor.toFixed(1)}
          note="Engagement"
        />
        <Stat
          label="Top country"
          value={
            topCountries[0]
              ? `${flag(topCountries[0].country)} ${topCountries[0].country}`
              : '—'
          }
          note={topCountries[0] ? `${topCountries[0].views} views` : 'No data yet'}
        />
      </div>

      <section className="admin-dash__section">
        <h2>Daily traffic</h2>
        {daily.length === 0 || daily.every((d) => d.views === 0) ? (
          <p className="admin-muted">
            No traffic recorded yet. Once visitors start landing on the public
            site, this chart will fill in.
          </p>
        ) : (
          <DailyTrafficChart data={daily} />
        )}
      </section>

      <div className="admin-analytics__grid">
        <section className="admin-dash__section">
          <h2>Top pages</h2>
          <RankedTable
            rows={topPages.map((p) => ({ label: p.path, value: p.views }))}
            valueLabel="Views"
            empty="No page views yet."
          />
        </section>

        <section className="admin-dash__section">
          <h2>Top countries</h2>
          <RankedTable
            rows={topCountries.map((c) => ({
              label: `${flag(c.country)} ${COUNTRY_NAMES[c.country] ?? c.country}`,
              value: c.views,
            }))}
            valueLabel="Views"
            empty="No country data yet."
          />
        </section>

        <section className="admin-dash__section">
          <h2>Where they came from</h2>
          <RankedTable
            rows={topReferrers.map((r) => ({ label: r.referrer, value: r.views }))}
            valueLabel="Views"
            empty="Most visitors arrived directly. Once you have inbound links from Google, social, or other sites, they'll show up here."
          />
        </section>

        <section className="admin-dash__section">
          <h2>Devices</h2>
          <BarBreakdown
            rows={devices.map((d) => ({ label: d.device, value: d.views, percent: d.percent }))}
            empty="No device data yet."
          />
        </section>

        <section className="admin-dash__section">
          <h2>Browsers</h2>
          <BarBreakdown
            rows={browsers.map((b) => ({ label: b.browser, value: b.views, percent: b.percent }))}
            empty="No browser data yet."
          />
        </section>
      </div>
    </div>
  );
}

// ---------- Reusable bits ----------

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="admin-stat">
      <div className="admin-stat__label">{label}</div>
      <div className="admin-stat__value">{value}</div>
      {note && <div className="admin-stat__note">{note}</div>}
    </div>
  );
}

function RankedTable({
  rows,
  valueLabel,
  empty,
}: {
  rows: Array<{ label: string; value: number }>;
  valueLabel: string;
  empty: string;
}) {
  if (rows.length === 0) return <p className="admin-muted">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <table className="admin-table admin-analytics__rankedtable">
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td className="admin-analytics__rankedlabel">
              <div className="admin-analytics__bar">
                <div
                  className="admin-analytics__barfill"
                  style={{ width: `${(r.value / max) * 100}%` }}
                />
                <span className="admin-analytics__barlabel">{r.label}</span>
              </div>
            </td>
            <td className="admin-table__right" style={{ width: 90 }}>
              {r.value.toLocaleString()}
              <span className="admin-analytics__valuelabel"> {valueLabel.toLowerCase()}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BarBreakdown({
  rows,
  empty,
}: {
  rows: Array<{ label: string; value: number; percent: number }>;
  empty: string;
}) {
  if (rows.length === 0) return <p className="admin-muted">{empty}</p>;
  return (
    <table className="admin-table admin-analytics__rankedtable">
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td className="admin-analytics__rankedlabel">
              <div className="admin-analytics__bar">
                <div
                  className="admin-analytics__barfill"
                  style={{ width: `${r.percent}%` }}
                />
                <span className="admin-analytics__barlabel">{r.label}</span>
              </div>
            </td>
            <td className="admin-table__right" style={{ width: 110 }}>
              {r.percent}%
              <span className="admin-analytics__valuelabel"> · {r.value}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DailyTrafficChart({
  data,
}: {
  data: Array<{ date: string; views: number; visitors: number }>;
}) {
  const W = 720;
  const H = 220;
  const PAD_X = 36;
  const PAD_TOP = 12;
  const PAD_BOTTOM = 28;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_TOP - PAD_BOTTOM;

  const maxVal = Math.max(...data.map((d) => d.views), 1);
  // Round axis up to a "nice" number for readable labels
  const niceMax = Math.ceil(maxVal / Math.pow(10, Math.floor(Math.log10(maxVal)))) *
    Math.pow(10, Math.floor(Math.log10(maxVal))) || maxVal;

  const x = (i: number) =>
    PAD_X + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => PAD_TOP + innerH - (v / niceMax) * innerH;

  const viewsPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.views)}`).join(' ');
  const visitorsPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.visitors)}`).join(' ');

  // Show ~6 x-axis labels max
  const labelStep = Math.max(1, Math.ceil(data.length / 6));

  return (
    <div className="admin-analytics__chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Daily traffic chart">
        {/* gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <line
            key={i}
            x1={PAD_X}
            x2={W - PAD_X}
            y1={PAD_TOP + innerH * (1 - t)}
            y2={PAD_TOP + innerH * (1 - t)}
            stroke="var(--ink-faint, #e5e1d8)"
            strokeDasharray="2 4"
          />
        ))}
        {/* y-axis labels */}
        <text x={PAD_X - 8} y={PAD_TOP + 4} textAnchor="end" fontSize="10" fill="var(--ink-soft, #777)">
          {niceMax}
        </text>
        <text x={PAD_X - 8} y={PAD_TOP + innerH + 4} textAnchor="end" fontSize="10" fill="var(--ink-soft, #777)">
          0
        </text>

        {/* views area */}
        <path
          d={`${viewsPath} L ${x(data.length - 1)} ${PAD_TOP + innerH} L ${x(0)} ${PAD_TOP + innerH} Z`}
          fill="rgba(220, 38, 38, 0.08)"
        />
        {/* views line */}
        <path d={viewsPath} fill="none" stroke="#dc2626" strokeWidth="2" />
        {/* visitors line */}
        <path d={visitorsPath} fill="none" stroke="#1d4ed8" strokeWidth="2" strokeDasharray="3 3" />

        {/* x-axis labels */}
        {data.map((d, i) =>
          i % labelStep === 0 || i === data.length - 1 ? (
            <text
              key={i}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              fontSize="10"
              fill="var(--ink-soft, #777)"
            >
              {d.date.slice(5)}
            </text>
          ) : null,
        )}
      </svg>

      <div className="admin-analytics__legend">
        <span><span className="admin-analytics__swatch" style={{ background: '#dc2626' }} /> Page views</span>
        <span><span className="admin-analytics__swatch admin-analytics__swatch--dashed" style={{ background: '#1d4ed8' }} /> Visitors</span>
      </div>
    </div>
  );
}
