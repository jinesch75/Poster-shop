'use server';

// Server action invoked from the product page. Keeps the Stripe SDK
// firmly on the server and redirects the browser to the Checkout Session.
//
// Errors propagate as thrown Errors — Next.js will render the closest
// error boundary. A tidier UX (inline error banner) can come later.

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { createCheckoutForPoster } from '@/lib/checkout';

export async function startCheckoutForPoster(formData: FormData) {
  const slug = formData.get('slug');
  if (typeof slug !== 'string' || !slug) {
    throw new Error('Missing poster slug.');
  }

  const poster = await prisma.poster.findFirst({
    where: { slug, status: 'PUBLISHED' },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      previewKey: true,
      priceDigitalCents: true,
    },
  });

  if (!poster) {
    throw new Error('That poster is no longer available.');
  }

  const url = await createCheckoutForPoster({
    posterId: poster.id,
    slug: poster.slug,
    title: poster.title,
    description: poster.description,
    previewKey: poster.previewKey,
    priceCents: poster.priceDigitalCents,
  });

  // `redirect` works by throwing internally; nothing after this runs.
  redirect(url);
}
