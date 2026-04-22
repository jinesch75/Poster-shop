import Image from 'next/image';
import Link from 'next/link';
import { PosterCard } from '@/components/PosterCard';
import { Watermark } from '@/components/Watermark';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { NewsletterForm } from '@/components/NewsletterForm';
import {
  getPublishedPosters,
  getCities,
  getHeroPosterView,
} from '@/lib/posters';

// Always fresh — content can change in the admin panel.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [hero, posters, cities] = await Promise.all([
    getHeroPosterView(),
    getPublishedPosters(),
    getCities(),
  ]);

  return (
    <>
      <Nav />

      {/* ============ HERO ============ */}
      <section className="hero">
        <div>
          <h1>
            Cities,<br />drawn in<br />
            <span className="italic">primary colors.</span>
          </h1>
          <p className="lede">
            Architectural posters where line meets the De&nbsp;Stijl palette.
            High-resolution digital downloads, ready to print at A4 from any
            home or local print shop. €5 for a single poster, €20 for any five.
          </p>
          <div className="cta-row">
            <Link className="btn-primary" href="/shop">
              Browse the London series
              <svg className="arrow" width="16" height="12" viewBox="0 0 16 12" fill="none">
                <path d="M1 6h14M10 1l5 5-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
              </svg>
            </Link>
            <Link className="btn-ghost" href="#about">About the work</Link>
          </div>
        </div>

        {hero && (
          <div className="featured">
            <div style={{ position: 'relative' }}>
              <span className="tick tr">Featured. {hero.number}</span>
              <span className="tick bl">PNG + PDF · €{hero.priceEur}</span>
              <div className="frame">
                <Image
                  src={hero.file}
                  alt={hero.title}
                  width={900}
                  height={1200}
                  priority
                  sizes="(max-width: 900px) 100vw, 40vw"
                />
                <Watermark lines={9} fontSize={14} />
              </div>
            </div>
            <div className="caption">
              <div>
                <Link href={`/shop/${hero.slug}`} className="title">
                  {hero.title}
                </Link>
                <div className="mono-label" style={{ marginTop: 4 }}>
                  {hero.city} · {hero.number}
                </div>
              </div>
              <div className="price">from €{hero.priceEur}</div>
            </div>
          </div>
        )}
      </section>

      {/* ============ GALLERY ============ */}
      <section className="section" id="shop">
        <div className="section-header">
          <div className="eyebrow">
            <span className="num">N°01</span>
            <span className="mono-label">The London series — Spring 2026</span>
          </div>
          <div className="inner-row">
            <h2 className="title">
              The London <span className="italic">Series.</span>
            </h2>
            <p className="aside">
              Eight studies of the city&apos;s most-drawn landmarks, each
              rendered in line and primary block. Available as digital
              download — watermark-free, print-ready at A4.
            </p>
          </div>
        </div>

        <div className="gallery-grid">
          {posters.map((p) => (
            <PosterCard key={p.slug} poster={p} />
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, marginTop: 64 }}>
          <Link className="btn-ghost" href="/shop">View the full catalogue</Link>
          <p className="gallery-wm-note">
            Preview images carry a diagonal watermark. Downloads are delivered clean and unmarked.
          </p>
        </div>
      </section>

      {/* ============ CITIES ============ */}
      <section className="section" id="cities">
        <div className="section-header">
          <div className="eyebrow">
            <span className="num">N°02</span>
            <span className="mono-label">The Atlas — ongoing</span>
          </div>
          <div className="inner-row">
            <h2 className="title">
              One city at a <span className="italic">time.</span>
            </h2>
            <p className="aside">
              A slow catalogue. Each capital gets its own series — same line,
              same palette, different architecture. Subscribe to be notified
              when the next one goes up.
            </p>
          </div>
        </div>

        <div className="cities">
          {cities.map((city) => {
            const available = city.status === 'AVAILABLE';
            return (
              <Link
                key={city.slug}
                href={available ? `/city/${city.slug}` : '#'}
                className={`city-row ${available ? '' : 'soon'}`}
                aria-disabled={!available}
              >
                <span className="num">{city.number}</span>
                <span className="name">{city.name}</span>
                <span className="count">
                  {city.posterCount > 0
                    ? `${String(city.posterCount).padStart(2, '0')} posters`
                    : city.status === 'IN_PROGRESS'
                      ? 'In progress'
                      : '—'}
                </span>
                <span
                  className="status"
                  style={available ? { color: 'var(--ink)' } : undefined}
                >
                  {city.statusLabel}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ============ IN CONTEXT (MOCKUPS) ============ */}
      <section className="section" id="in-context" style={{ background: 'var(--paper-warm)' }}>
        <div className="section-header">
          <div className="eyebrow">
            <span className="num">N°03</span>
            <span className="mono-label">In situ</span>
          </div>
          <div className="inner-row">
            <h2 className="title">
              On the <span className="italic">wall.</span>
            </h2>
            <p className="aside">
              Every poster is composited into an office and a residential
              setting so you can see the scale and colour before you commit.
            </p>
          </div>
        </div>

        <div className="in-context">
          {['Office', 'Living room'].map((label) => (
            <div className="room-placeholder" key={label}>
              <div className="ph-corner tl"></div>
              <div className="ph-corner tr"></div>
              <div className="ph-corner bl"></div>
              <div className="ph-corner br"></div>
              <div className="ph-inner">
                <span className="ph-label">Mockup · {label}</span>
                <span className="ph-hint">Canva render to be uploaded</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ ABOUT THE WORK ============ */}
      <section className="section" id="about">
        <div className="section-header">
          <div className="eyebrow">
            <span className="num">N°04</span>
            <span className="mono-label">About the work</span>
          </div>
          <div className="inner-row">
            <h2 className="title">
              Architecture, seen through a{' '}
              <span className="italic">De&nbsp;Stijl lens.</span>
            </h2>
          </div>
        </div>

        <div className="manifesto">
          <p className="big-q">
            Each poster takes a city&apos;s most-drawn landmarks — towers,
            bridges, corners, street furniture — and reduces them to the
            essentials: a clean line drawing, the three primary colors, a
            white ground. It&apos;s the conversation Mondrian never got to
            have with a cathedral or a bridge: geometry meeting geometry,
            the building offering its structure, the palette answering with{' '}
            <span className="italic">red, yellow, and blue.</span> A quiet
            collection for people who love cities and modernist design in
            roughly equal measure.
          </p>
          <div className="sig">
            <span className="line"></span>
            <span>Linework Studio · Luxembourg</span>
          </div>
        </div>
      </section>

      {/* ============ NEWSLETTER ============ */}
      <section className="newsletter" id="journal">
        <div className="inner">
          <div>
            <h2>
              Join the <span className="italic">studio list.</span>
            </h2>
            <p className="note">One email when a new city drops. No sales, no fluff.</p>
          </div>
          <div>
            <NewsletterForm source="home-journal" />
            <div className="small">Unsubscribe anytime · GDPR compliant · No spam, ever.</div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
