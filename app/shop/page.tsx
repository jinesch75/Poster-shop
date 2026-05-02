// /shop is gone — the site has two galleries (/, /mondrian) and a
// thinner top nav. This stub permanently redirects any old /shop link
// (bookmarks, QR posters, Brevo emails, Google's index) to the
// homepage. Product pages at /shop/[slug] are unaffected.

import { permanentRedirect } from 'next/navigation';

export default function ShopRedirect() {
  permanentRedirect('/');
}
