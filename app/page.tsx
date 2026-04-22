import Image from 'next/image';
import Link from 'next/link';
import { PosterCard } from '@/components/PosterCard';
import { Watermark } from '@/components/Watermark';
import { posters, featuredPoster, cities } from '@/lib/posters';

export default function HomePage() {
  return (
    <>
      {/* ============ NAV ============ */}
      <nav className="top">
        <div className="wordmark">
          Linework <span className="studio-sub">Studio</span>
        </div>
        <div className="links">
          <Link href="#shop">Shop</Link>
          <Link href="#cities">Cities</Link>
          <Link href="#about">About</Link>
          <Link href="#journal">Journal</Link>
        </div>
        <div className="right">
          <Link href="/account">Account</Link>
          <Link href="/cart" className="cart">
            Cart <span className="badge">0</span>
          </Link>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <section className="hero">
        <div>
          <h1>
            Cities,<br />drawn in<br />
            <span className="italic">primary colors.</span>
          </h1>
          <p className="lede">
            Original architectural posters — where the draftsman&apos;s line
            meets the De&nbsp;Stijl palette. High-resolution digital downloads,
            ready to print at A4 from any home or local print shop. €5 for a
            single poster, €20 for any five.
          </p>
          <div className="cta-row">
            <Link className="btn-primary" href="#shop">
              Browse the London series
              <svg className="arrow" width="16" height="12" viewBox="0 0 16 12" fill="none">
                <path d="M1 6h14M10 1l5 5-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
              </svg>
            </Link>
            <Link className="btn-ghost" href="#about">Read the process</Link>
          </div>
        </div>

        <div className="featured">
          <div style={{ position: 'relative' }}>
            <span className="tick tr">Featured. {featuredPoster.number}</span>
            <span className="tick bl">PNG + PDF · €5</span>
            <div className="frame">
              <Image
                src={featuredPoster.file}
                alt={featuredPoster.title}
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
              <div className="title">{featuredPoster.title}</div>
              <div className="mono-label" style={{ marginTop: 4 }}>
                {featuredPoster.city} · {featuredPoster.number}
              </div>
            </div>
            <div className="price">from €{featuredPoster.priceEur}</div>
          </div>
        </div>
      </section>

      {/* ============ GALLERY ============ */}
      <section className="section" id="shop">
        <div className="section-header">
          <div className="eyebrow">
            <span className="num">N°01</span>
            <span className="mono-label">Working from London — Spring 2026</span>
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
          <Link className="btn-ghost" href="/shop">View the full London collection</Link>
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
              A slow catalogue. Each city takes three months — research,
              sketching, layering, release. Subscribe to be notified when
              the next one goes up.
            </p>
          </div>
        </div>

        <div className="cities">
          {cities.map((city) => (
            <div key={city.slug} className={`city-row ${city.status === 'available' ? '' : 'soon'}`}>
              <span className="num">{city.number}</span>
              <span className="name">{city.name}</span>
              <span className="count">
                {city.posterCount > 0 ? `${String(city.posterCount).padStart(2, '0')} posters` : city.status === 'in-progress' ? 'In progress' : '—'}
              </span>
              <span className="status" style={city.status === 'available' ? { color: 'var(--ink)' } : undefined}>
                {city.statusLabel}
              </span>
            </div>
          ))}
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
              Every poster is auto-composited into an office and a
              residential setting so you can see the scale and colour
              before you commit.
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

      {/* ============ ABOUT / MANIFESTO ============ */}
      <section className="section" id="about">
        <div className="section-header">
          <div className="eyebrow">
            <span className="num">N°04</span>
            <span className="mono-label">Process — a short note</span>
          </div>
          <div className="inner-row">
            <h2 className="title">
              Why <span className="italic">primaries?</span>
            </h2>
          </div>
        </div>

        <div className="manifesto">
          <p className="big-q">
            &ldquo;I draw the city the way a structural engineer would —
            hairlines, vanishing points, brickwork. Then I invite Piet
            Mondrian in. He brings red, yellow, and blue, and suddenly
            the building is also a <span className="italic">painting.</span>&rdquo;
          </p>
          <div className="sig">
            <span className="line"></span>
            <span>Jacques, founder</span>
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
            <form>
              <input type="email" placeholder="your@email.com" required aria-label="Email address" />
              <button type="submit">
                Subscribe
                <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                  <path d="M1 5h12M9 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              </button>
            </form>
            <div className="small">Unsubscribe anytime · GDPR compliant · No spam, ever.</div>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer>
        <div className="cols">
          <div className="mark">
            Linework <span className="studio-sub">Studio</span>
            <small>Architectural posters. Brussels.</small>
          </div>
          <div className="col">
            <h4>Shop</h4>
            <ul>
              <li>All posters</li>
              <li>London</li>
              <li>Bundles</li>
              <li>Gift cards</li>
            </ul>
          </div>
          <div className="col">
            <h4>Studio</h4>
            <ul>
              <li>About</li>
              <li>Process</li>
              <li>Commissions</li>
              <li>For offices</li>
            </ul>
          </div>
          <div className="col">
            <h4>Help</h4>
            <ul>
              <li>Licence info</li>
              <li>Contact</li>
              <li>FAQ</li>
            </ul>
          </div>
        </div>
        <div className="bottom">
          <span>© 2026 Linework Studio · Brussels, Belgium</span>
          <span>Terms · Privacy · Imprint</span>
        </div>
      </footer>
    </>
  );
}
