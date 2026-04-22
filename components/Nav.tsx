// Shared top navigation. Server Component — no client state needed.
// Cart badge is a static 0 until Session 4 wires Stripe / a cart store.

import Link from 'next/link';

export function Nav() {
  return (
    <nav className="top">
      <Link href="/" className="wordmark">
        Linework <span className="studio-sub">Studio</span>
      </Link>
      <div className="links">
        <Link href="/shop">Shop</Link>
        <Link href="/#cities">Cities</Link>
        <Link href="/#about">About</Link>
        <Link href="/#journal">Journal</Link>
      </div>
      <div className="right">
        <Link href="/account">Account</Link>
        <Link href="/cart" className="cart">
          Cart <span className="badge">0</span>
        </Link>
      </div>
    </nav>
  );
}
