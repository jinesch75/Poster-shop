// Shared zod schemas for form validation.
// Use in server actions before writing to Prisma.

import { z } from 'zod';

export const PosterUploadSchema = z.object({
  title: z.string().trim().min(2, 'Title is required').max(120),
  number: z.string().trim().min(1).max(10).default('N°?'),
  description: z.string().trim().min(10, 'Description is required').max(800),
  cityId: z.string().min(1, 'City is required'),
  priceEur: z.coerce.number().int().min(1).max(500).default(5),
  publish: z.enum(['on', '']).optional().transform((v) => v === 'on'),
  landmarkType: z.string().trim().max(40).optional(),
});

export type PosterUploadInput = z.infer<typeof PosterUploadSchema>;

export const PosterUpdateSchema = PosterUploadSchema.partial().extend({
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
});

export type PosterUpdateInput = z.infer<typeof PosterUpdateSchema>;

/** Safe parse that extracts the first error message. */
export function firstError(result: z.SafeParseReturnType<unknown, unknown>): string | null {
  if (result.success) return null;
  return result.error.issues[0]?.message ?? 'Invalid input';
}
