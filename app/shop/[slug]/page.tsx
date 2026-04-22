import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Watermark } from '@/components/Watermark';
import { getPoster, posters } from '@/lib/posters';

export async function generateStaticParams() {
  return posters.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const poster = getPoster(slug);
  if (!poster) return {};
  return {
    title: `${poster.title} — Linework Studio`,
    description: poster.description,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const poster = getPoster(slug);
  if (!poster) notFound();

  return (
    <>
      <nav className="top">
        <Link href="/" className="wordmark">
          Linework <span className="studio-sub">Studio</span>
        </Link>
        <div className="links">
          <Link href="/#shop">Shop</Link>
          <Link href="/#cities">Cities</Link>
          <Link href="/#about">About</Link>
        </div>
        <div className="right">
          <Link href="/account">Account</Link>
          <Link href="/cart" className="cart">
            Cart <span className="badge">0</span>
          </Link>
        </div>
      </nav>

      <section className="section">
        <div className="product">
          <div className="main-preview">
            <Image
              src={poster.file}
              alt={poster.title}
              width={1856}
              height={2464}
              priority
              sizes="(max-width: 900px) 100vw, 55vw"
            />
            <Watermark lines={8} fontSize={20} />
          </div>

          <div className="info">
            <div className="breadcrumb">
              <Link href="/#shop" style={{ borderBottom: '1px solid var(--rule-strong)', paddingBottom: 1 }}>
                Shop
              </Link>{' '}
              / {poster.city} / {poster.title}
            </div>
            <h2>{poster.title}</h2>
            <p className="byline">{poster.description}</p>

            <p className="wm-note">
              <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10 2l7 4v5c0 4-3 7-7 8-4-1-7-4-7-8V6z" />
                <path d="M7 10l2 2 4-4" />
              </svg>
              <span>
                The watermark shown here is only on the preview. Your downloaded files are{' '}
                <strong>clean, unmarked, and yours to print.</strong>
              </span>
            </p>

            <div className="divider"></div>

            <div className="total-row">
              <div className="total-label">Price</div>
              <div className="total-value">€{poster.priceEur}.00</div>
            </div>

            <div className="buy-row">
              <button className="btn-full" disabled title="Checkout wiring arrives in Session 4">
                Add to cart · download now
              </button>
              <button className="btn-icon" aria-label="Save">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M6 3h12v18l-6-4-6 4z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
