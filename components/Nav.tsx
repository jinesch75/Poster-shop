// Shared top navigation. Server Component — no client state needed.

import Link from 'next/link';

export function Nav() {
  return (
    <nav className="top">
      <Link href="/" className="wordmark">
        Linework <span className="studio-sub">Studio</span>
      </Link>
      <div className="links">
        <Link href="/shop">Shop</Link>
        <Link href="/about">About</Link>
      </div>
    </nav>
  );
}
