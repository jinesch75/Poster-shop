// Node-only startup configuration. Imported from instrumentation.ts behind a
// NEXT_RUNTIME === 'nodejs' check so the Edge compiler never sees it.
//
// This is where sharp's libvips tuning HAS to live. It was previously set at
// module load in lib/watermark.ts, on the assumption that watermark.ts is the
// only runtime consumer of sharp. It isn't — Next.js's own image optimizer
// requires sharp independently — and worse, Next loads route modules lazily,
// so on a server only ever serving public pages watermark.ts is never
// imported and those settings never executed. The optimizer ran with libvips'
// default 50 MB operation cache and one worker per CPU, holding ~1.6 GB of
// native memory the process never returned.
//
// cache() and concurrency() are process-global libvips settings, so setting
// them here covers every consumer: the optimizer, watermark.ts, the seed and
// any tsx script.

import sharp from 'sharp';

// Our masters are 20–40 MB one-shot files, resized once and never touched
// again. The operation cache only pins native memory for us.
sharp.cache(false);

// CPU sits near 0% and the pipeline is sequential; extra libvips workers just
// carry extra tile buffers.
sharp.concurrency(1);
