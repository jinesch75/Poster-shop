// Compact site footer. Newsletter sits inline next to its pitch, with
// legal links pushed to the right. Full legal suite still reachable —
// just condensed into a one-line row.

import Link from 'next/link';
import { NewsletterForm } from './NewsletterForm';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="news-group">
        <div className="news-pitch">
          Join the <span className="italic">studio list</span> — one email when a new city drops.
        </div>
        <NewsletterForm source="footer" />
      </div>
      <div className="links">
        <Link href="/about">About</Link>
        <span className="sep">·</span>
        <Link href="/legal/terms">Terms</Link>
        <span className="sep">·</span>
        <Link href="/legal/privacy">Privacy</Link>
        <span className="sep">·</span>
        <Link href="/legal/imprint">Imprint</Link>
        <span className="sep">·</span>
        <span>© 2026 Linework Studio</span>
      </div>
    </footer>
  );
}
