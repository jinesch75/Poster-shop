// Shared footer.
// The Help column links to the full legal suite introduced in Session 5.
// Keep labels short — this is a quick jump-nav, not a menu of descriptions.

import Link from 'next/link';

export function Footer() {
  return (
    <footer>
      <div className="cols">
        <div className="mark">
          Linework <span className="studio-sub">Studio</span>
          <small>Architectural posters. Luxembourg.</small>
        </div>
        <div className="col">
          <h4>Shop</h4>
          <ul>
            <li>
              <Link href="/shop">All posters</Link>
            </li>
            <li>
              <Link href="/city/london">London</Link>
            </li>
            <li>
              <Link href="/shop?bundle=true">Bundles</Link>
            </li>
          </ul>
        </div>
        <div className="col">
          <h4>Studio</h4>
          <ul>
            <li>
              <Link href="/#about">About</Link>
            </li>
            <li>
              <Link href="/#cities">Cities</Link>
            </li>
            <li>
              <Link href="/#journal">Newsletter</Link>
            </li>
          </ul>
        </div>
        <div className="col">
          <h4>Help</h4>
          <ul>
            <li>
              <Link href="/legal/licence">Licence</Link>
            </li>
            <li>
              <Link href="/legal/refund">Refunds</Link>
            </li>
            <li>
              <Link href="/legal/terms">Terms</Link>
            </li>
            <li>
              <Link href="/legal/privacy">Privacy</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="bottom">
        <span>© 2026 Linework Studio · Luxembourg</span>
        <span>
          <Link href="/legal/terms">Terms</Link>
          {' · '}
          <Link href="/legal/privacy">Privacy</Link>
          {' · '}
          <Link href="/legal/cookies">Cookies</Link>
          {' · '}
          <Link href="/legal/imprint">Imprint</Link>
        </span>
      </div>
    </footer>
  );
}
