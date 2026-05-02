// Shared top navigation. Client Component because it reads the current
// pathname to bold whichever gallery link the visitor is currently on.

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Nav() {
  const pathname = usePathname();

  // Main gallery covers the homepage and per-city pages — those all
  // belong to the Main collection. Mondrian only matches /mondrian.
  const isMain =
    pathname === '/' || pathname.startsWith('/city/');
  const isMondrian = pathname.startsWith('/mondrian');

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
        <Link href="/" aria-current={isMain ? 'page' : undefined}>
          Main Gallery
        </Link>
        <Link href="/mondrian" aria-current={isMondrian ? 'page' : undefined}>
          Mondrian Gallery
        </Link>
      </div>
      {/* Empty third column so the grid centres the links against
          a balanced left/right gutter, regardless of wordmark width. */}
      <div className="nav-spacer" aria-hidden="true" />
    </nav>
  );
}
