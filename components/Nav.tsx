// Shared top navigation. Server Component — no client state needed.

import Link from 'next/link';

export function Nav() {
  return (
    <nav className="top">
      <Link href="/" className="wordmark" aria-label="Gridline Cities — home">
        <svg
          className="brand-mark"
          viewBox="0 0 100 100"
          width="20"
          height="20"
          aria-hidden="true"
          style={{ alignSelf: 'center' }}
        >
          <rect x="6" y="6" width="88" height="88" fill="none" stroke="currentColor" strokeWidth="8" />
          <line x1="40" y1="6" x2="40" y2="94" stroke="currentColor" strokeWidth="8" />
          <line x1="6" y1="60" x2="94" y2="60" stroke="currentColor" strokeWidth="8" />
        </svg>
        <span className="wordmark-text">Gridline <span className="studio-sub">Cities</span></span>
      </Link>
      <div className="links">
        <Link href="/shop">Shop</Link>
        <Link href="/mondrian">Mondrian</Link>
        <Link href="/about">About</Link>
      </div>
    </nav>
  );
}
