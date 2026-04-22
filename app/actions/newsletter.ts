// Newsletter server action.
// Validates an email, upserts into Subscriber, returns a friendly result.
// No email is sent yet — Resend integration lands in Session 5.

'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';

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

  return {
    ok: true,
    message: "You're on the list. We'll be in touch when the next city drops.",
  };
}
