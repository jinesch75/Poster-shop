// Newsletter server action.
// Validates an email, upserts into Subscriber (so admin sees the count even
// if Brevo is down), then subscribes the contact to the Brevo list.
//
// DB write and Brevo write are independent on purpose: we'd rather double-
// record than lose the signup. A background reconciliation could sync
// Subscribers that didn't make it into Brevo; not needed for launch traffic.

'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { subscribeContact } from '@/lib/email';

const SubscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email.'),
  source: z.string().max(40).optional(),
});

export type NewsletterResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export async function subscribe(
  _prev: NewsletterResult | null,
  formData: FormData,
): Promise<NewsletterResult> {
  const parsed = SubscribeSchema.safeParse({
    email: formData.get('email'),
    source: formData.get('source') ?? undefined,
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid email.' };
  }

  const { email, source } = parsed.data;

  try {
    await prisma.subscriber.upsert({
      where: { email },
      update: { source: source ?? undefined },
      create: { email, source },
    });
  } catch {
    return {
      ok: false,
      message: 'Something went wrong on our side. Please try again.',
    };
  }

  // Subscribe to Brevo list. Do NOT block the user-facing success response
  // on this — a Brevo outage shouldn't look like a broken signup form.
  // Errors are logged inside subscribeContact; we just don't surface them.
  const brevo = await subscribeContact({ email, source });
  if (!brevo.ok) {
    console.warn('[newsletter] brevo subscribe soft-failed', brevo.error);
  }

  return {
    ok: true,
    message: "You're on the list. We'll be in touch when the next city drops.",
  };
}
