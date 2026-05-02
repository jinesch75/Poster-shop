import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { processMaster, refreshLivingRoomMockups } from '@/lib/watermark';
import { PosterUploadSchema, firstError } from '@/lib/validation';

export const metadata = { title: 'Upload poster — Gridline Cities Admin' };
export const dynamic = 'force-dynamic';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

// Redirects back to the form with an inline error message instead of
// throwing — throwing in a server action shows the white-screen
// "Application error" page in production, which hides the actual issue.
function failWith(message: string): never {
  redirect(`/admin/posters/new?error=${encodeURIComponent(message)}`);
}

async function createPoster(formData: FormData) {
  'use server';

  const parsed = PosterUploadSchema.safeParse({
    title: formData.get('title'),
    number: formData.get('number') || undefined,
    description: formData.get('description'),
    cityId: formData.get('cityId'),
    priceEur: formData.get('priceEur'),
    publish: formData.get('publish') ?? '',
    landmarkType: formData.get('landmarkType') || undefined,
    gallery: formData.get('gallery') || undefined,
  });

  if (!parsed.success) {
    failWith(firstError(parsed) ?? 'Invalid input');
  }

  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) {
    failWith('A master image file is required.');
  }
  // Reject anything larger than 50MB — matches next.config.mjs bodySizeLimit.
  if (file.size > 50 * 1024 * 1024) {
    failWith('Master image is over the 50MB limit.');
  }
  if (!['image/png', 'image/jpeg'].includes(file.type)) {
    failWith('Only PNG or JPEG master files are accepted.');
  }

  const { title, number, description, cityId, priceEur, publish, landmarkType, gallery } =
    parsed.data;

  const ext = file.type === 'image/jpeg' ? 'jpg' : 'png';
  const buffer = Buffer.from(await file.arrayBuffer());

  const slug = slugify(title);

  // Block duplicate slugs proactively with a friendly message rather than
  // surfacing the Prisma P2002 unique-constraint error as a 500.
  const existing = await prisma.poster.findUnique({ where: { slug } });
  if (existing) {
    failWith(
      `A poster with the title "${title}" already exists. Pick a different title (e.g. add the year, the angle, or a roman numeral).`,
    );
  }

  let derivatives: Awaited<ReturnType<typeof processMaster>>;
  try {
    derivatives = await processMaster(buffer, ext);
  } catch (err) {
    console.error('processMaster failed', err);
    failWith('Image processing failed — try a different file or check the master is at least 800px on the long edge.');
  }

  let createdId: string;
  try {
    const created = await prisma.poster.create({
      data: {
        slug,
        title,
        number,
        description,
        cityId,
        landmarkType,
        gallery,
        masterKey: derivatives.masterKey,
        previewKey: derivatives.previewKey,
        thumbnailKey: derivatives.thumbnailKey,
        mockupOfficeKey: derivatives.mockupOfficeKey,
        masterWidthPx: derivatives.widthPx,
        masterHeightPx: derivatives.heightPx,
        priceDigitalCents: Math.round(priceEur * 100),
        status: publish ? 'PUBLISHED' : 'DRAFT',
      },
      select: { id: true },
    });
    createdId = created.id;
  } catch (err) {
    // Defensive: catches the rare race where a duplicate slug appears
    // between the findUnique check above and the create call.
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code?: unknown }).code === 'P2002'
    ) {
      failWith(
        `A poster with the title "${title}" already exists. Pick a different title.`,
      );
    }
    throw err;
  }

  // Build the living-room triptych variants now that the row exists.
  // Failures here don't block the upload — the page falls back to a
  // placeholder slot until the maintenance backfill is run.
  try {
    await refreshLivingRoomMockups(createdId);
  } catch (err) {
    console.error('living-room mockup refresh failed', err);
  }

  redirect('/admin/posters');
}

export default async function AdminNewPosterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const cities = await prisma.city.findMany({ orderBy: { number: 'asc' } });

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <p className="admin-page__eyebrow">Catalog</p>
          <h1>Upload new poster</h1>
          <p className="admin-page__sub">
            The master file stays private. We generate a watermarked preview,
            a thumbnail, and two room mockups automatically.
          </p>
        </div>
      </header>

      {error && (
        <p className="admin-banner admin-banner--error" role="alert">
          {error}
        </p>
      )}

      <form action={createPoster} className="admin-form" encType="multipart/form-data">
        <div className="admin-form__row">
          <label>
            <span>Title</span>
            <input name="title" type="text" required />
          </label>
          <label>
            <span>Number</span>
            <input name="number" type="text" placeholder="N°09" />
          </label>
        </div>

        <label>
          <span>Description</span>
          <textarea name="description" rows={3} required />
        </label>

        <div className="admin-form__row">
          <label>
            <span>City</span>
            <select name="cityId" required defaultValue="">
              <option value="" disabled>
                Choose a city
              </option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Price (€)</span>
            <input name="priceEur" type="number" min={1} step={1} defaultValue={5} />
          </label>
        </div>

        <label>
          <span>Gallery</span>
          <select name="gallery" defaultValue="MAIN">
            <option value="MAIN">Main gallery</option>
            <option value="MONDRIAN">Mondrian style</option>
          </select>
        </label>

        <label>
          <span>Landmark type (optional — for shop filters)</span>
          <input
            name="landmarkType"
            type="text"
            placeholder="e.g. tower, bridge, street furniture"
          />
        </label>

        <label>
          <span>Master image (PNG or JPG, 4000px+ on long edge recommended)</span>
          <input name="file" type="file" accept="image/png,image/jpeg" required />
        </label>

        <label className="admin-form__checkbox">
          <input name="publish" type="checkbox" />
          <span>Publish immediately (otherwise saves as draft)</span>
        </label>

        <button type="submit" className="admin-btn-primary">
          Upload &amp; generate derivatives
        </button>
      </form>
    </div>
  );
}
