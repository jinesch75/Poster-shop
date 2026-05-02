// /about was removed when the nav was simplified. This stub permanently
// redirects any old /about link to the homepage so existing bookmarks
// and search-engine results don't 404.

import { permanentRedirect } from 'next/navigation';

export default function AboutRedirect() {
  permanentRedirect('/');
}
