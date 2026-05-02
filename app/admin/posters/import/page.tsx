// /admin/posters/import was the old bulk-import page. It had two flows:
// a drag-drop dropzone (now folded into /admin/posters) and a git-based
// reader that scanned `incoming/<city>/`. Both are removed as of
// 2026-05-02 — Jacques never reached for the git path, and the dropzone
// belongs in the catalog list itself.
//
// The directory and the `incoming/` folder are queued for deletion on
// Jacques' terminal:
//
//   rm -rf app/admin/posters/import incoming
//
// Until those run, /admin/posters/import 404s.
//
// (The sandbox can't unlink files under iCloud Drive — known limitation.)

import { notFound } from 'next/navigation';

export default function RemovedImportPage(): never {
  notFound();
}
