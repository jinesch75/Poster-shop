// /q/<slug> was a redirect endpoint that QR codes on poster previews
// pointed at, with a side-effect of logging a QrScan row. QR support
// was removed 2026-05-02 — this route now 404s. Queued for deletion
// on Jacques' terminal:
//
//   rm -rf app/q
//
// (The sandbox can't unlink files under iCloud Drive — known limitation.)

import { NextResponse } from 'next/server';

export function GET(): NextResponse {
  return new NextResponse(null, { status: 404 });
}
