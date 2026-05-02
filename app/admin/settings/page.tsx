// This page used to host a hero-poster picker, but the homepage no
// longer renders a hero poster (it shows the dense city-grid). The
// directory itself is queued for deletion on Jacques' terminal:
//
//   rm -rf app/admin/settings
//
// Until that runs, /admin/settings 404s.
//
// (The sandbox can't unlink files under iCloud Drive — known limitation.)

import { notFound } from 'next/navigation';

export default function RemovedSettingsPage(): never {
  notFound();
}
