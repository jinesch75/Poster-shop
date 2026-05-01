// Shared top navigation. Server Component — no client state needed.

import Link from 'next/link';

export function Nav() {
  return (
    <nav className="top">
      <Link href="/" className="wordmark">
        Gridline <span className="studio-sub">Cities</span>
      </Link>
      <div className="links">
        <Link href="/shop">Shop</Link>
        <Link href="/about">About</Link>
      </div>
    </nav>
  );
}
