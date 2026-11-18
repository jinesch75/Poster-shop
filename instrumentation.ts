// Runs once per server process, before any request is handled.
//
// This is where sharp's libvips tuning HAS to live. It was previously set at
// module load in lib/watermark.ts, on the assumption that watermark.ts is the
// only runtime consumer of sharp. It isn't, and worse, Next.js loads route
// modules lazily — on a production server that only ever serves public pages,
// watermark.ts is never imported and those settings never executed.
//
// Next.js's own image optimizer requires sharp independently. It was running
// with libvips' default 50 MB operation cache and a worker per CPU, which is
// what held ~1.6 GB of native memory that the process never returned.
//
// cache(false) and concurrency() are process-global libvips settings, so
// setting them here covers every sharp consumer: the optimizer, watermark.ts,
// the seed, and any tsx script.

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const sharp = (await import('sharp')).default;

  // Our masters are 20–40 MB one-shot files, resized once and never touched
  // again. The operation cache only pins native memory for us.
  sharp.cache(false);

  // CPU sits near 0% and the pipeline is sequential; extra libvips workers
  // just carry extra tile buffers.
  sharp.concurrency(1);
}
