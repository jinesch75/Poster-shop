// Shared footer. Location corrected to Luxembourg (studio base).

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
        <span>Terms · Privacy · Imprint</span>
      </div>
    </footer>
  );
}
