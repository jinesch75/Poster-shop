import Image from 'next/image';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { publicUrl } from '@/lib/storage';
import { processMaster, reprocessMaster } from '@/lib/watermark';

export const dynamic = 'force-dynamic';

function failBack(id: string, message: string): never {
  redirect(`/admin/posters/${id}?error=${encodeURIComponent(message)}`);
}

async function updatePoster(id: string, formData: FormData) {
  'use server';
  // Coerce gallery to a known enum value; anything else falls back to MAIN.
  const galleryRaw = String(formData.get('gallery') ?? 'MAIN');
  const gallery = galleryRaw === 'MONDRIAN' ? 'MONDRIAN' : 'MAIN';

  await prisma.poster.update({
    where: { id },
    data: {
      title: String(formData.get('title') ?? ''),
      number: String(formData.get('number') ?? ''),
      description: String(formData.get('description') ?? ''),
      cityId: String(formData.get('cityId') ?? ''),
      priceDigitalCents: Math.round(Number(formData.get('priceEur') ?? 5) * 100),
      status: formData.get('publish') === 'on' ? 'PUBLISHED' : 'DRAFT',
      gallery,
    },
  });
  redirect(`/admin/posters/${id}?ok=saved`);
}

async function regeneratePreviews(id: string) {
  'use server';
  const poster = await prisma.poster.findUniqueOrThrow({ where: { id } });
  // Skip legacy public: keys — they don't live on the volume yet.
  if (poster.masterKey.startsWith('public:')) {
    redirect(`/admin/posters/${id}?error=no-volume-master`);
  }
  const derivatives = await reprocessMaster(poster.masterKey);
  await prisma.poster.update({
    where: { id },
    data: {
      previewKey: derivatives.previewKey,
      thumbnailKey: derivatives.thumbnailKey,
      mockupOfficeKey: derivatives.mockupOfficeKey,
      mockupLivingKey: derivatives.mockupLivingKey,
    },
  });
  redirect(`/admin/posters/${id}?ok=regenerated`);
}

async function replaceMaster(id: string, formData: FormData) {
  'use server';
  const file = formData.get('file') as File | null;

  if (!file || file.size === 0) {
    failBack(id, 'Please select a master file to upload.');
  }
  if (file.size > 50 * 1024 * 1024) {
    failBack(id, 'Master image is over the 50MB limit.');
  }
  if (!['image/png', 'image/jpeg'].includes(file.type)) {
    failBack(id, 'Only PNG or JPEG master files are accepted.');
  }

  const ext = file.type === 'image/jpeg' ? 'jpg' : 'png';
  const buffer = Buffer.from(await file.arrayBuffer());

  let derivatives: Awaited<ReturnType<typeof processMaster>>;
  try {
    derivatives = await processMaster(buffer, ext);
  } catch (err) {
    console.error('processMaster failed', err);
    failBack(
      id,
      'Image processing failed — try a different file or check the master is at least 800px on the long edge.',
    );
  }

  await prisma.poster.update({
    where: { id },
    data: {
      masterKey: derivatives.masterKey,
      previewKey: derivatives.previewKey,
      thumbnailKey: derivatives.thumbnailKey,
      mockupOfficeKey: derivatives.mockupOfficeKey,
      mockupLivingKey: derivatives.mockupLivingKey,
      masterWidthPx: derivatives.widthPx,
      masterHeightPx: derivatives.heightPx,
    },
  });
  redirect(`/admin/posters/${id}?ok=master-replaced`);
}

async function deletePoster(id: string) {
  'use server';
  await prisma.poster.delete({ where: { id } });
  redirect('/admin/posters');
}

export default async function AdminPosterEdit({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { error, ok } = await searchParams;

  const [poster, cities] = await Promise.all([
    prisma.poster.findUnique({ where: { id }, include: { city: true } }),
    prisma.city.findMany({ orderBy: { number: 'asc' } }),
  ]);

  if (!poster) notFound();

  const update = updatePoster.bind(null, id);
  const regenerate = regeneratePreviews.bind(null, id);
  const replace = replaceMaster.bind(null, id);
  const del = deletePoster.bind(null, id);

  const preview = publicUrl(poster.previewKey ?? poster.masterKey);
  const officeMockup = publicUrl(poster.mockupOfficeKey);
  const livingMockup = publicUrl(poster.mockupLivingKey);
  const isLegacyPublic = poster.masterKey.startsWith('public:');

  const successMessage =
    ok === 'master-replaced'
      ? 'Master replaced. Watermark and mockups regenerated.'
      : ok === 'regenerated'
        ? 'Previews and mockups regenerated.'
        : ok === 'saved'
          ? 'Changes saved.'
          : null;

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <p className="admin-page__eyebrow">
            <Link href="/admin/posters">← All posters</Link>
          </p>
          <h1>{poster.title}</h1>
          <p className="admin-page__sub">
            {poster.city.name} · {poster.number}
          </p>
        </div>
      </header>

      {error === 'no-volume-master' ? (
        <p className="admin-banner">
          This poster&apos;s master lives in the legacy public bucket. Upload a
          fresh master below to regenerate derivatives.
        </p>
      ) : error ? (
        <p className="admin-banner admin-banner--error" role="alert">
          {error}
        </p>
      ) : null}

      {successMessage && (
        <p className="admin-banner admin-banner--success" role="status">
          {successMessage}
        </p>
      )}

      <div className="admin-split">
        <section className="admin-split__previews">
          {preview && (
            <div className="admin-preview">
              <Image src={preview} alt={poster.title} width={800} height={1000} unoptimized />
              <p className="admin-preview__caption">Watermarked preview</p>
            </div>
          )}
          <div className="admin-preview-row">
            {officeMockup && (
              <div className="admin-preview">
                <Image src={officeMockup} alt="Office mockup" width={800} height={550} unoptimized />
                <p className="admin-preview__caption">Office mockup</p>
              </div>
            )}
            {livingMockup && (
              <div className="admin-preview">
                <Image src={livingMockup} alt="Living room mockup" width={800} height={550} unoptimized />
                <p className="admin-preview__caption">Living room mockup</p>
              </div>
            )}
          </div>
          <form action={regenerate}>
            <button type="submit" className="admin-btn-ghost">
              Regenerate previews &amp; mockups
            </button>
          </form>

          <form
            action={replace}
            encType="multipart/form-data"
            className="admin-replace-master"
          >
            <h3>Replace master image</h3>
            <p className="admin-muted">
              Upload a new master file (PNG or JPG, up to 50MB). The watermarked
              preview, thumbnail, and both room mockups will be regenerated
              automatically. The poster&apos;s title, slug, and metadata stay
              unchanged.
              {isLegacyPublic && (
                <>
                  {' '}
                  <strong>
                    This poster currently uses a legacy seeded master — uploading
                    a new file moves it onto the volume and unlocks the regenerate
                    button.
                  </strong>
                </>
              )}
            </p>
            <input
              name="file"
              type="file"
              accept="image/png,image/jpeg"
              required
            />
            <button type="submit" className="admin-btn-primary">
              Replace master &amp; regenerate
            </button>
          </form>
        </section>

        <section className="admin-split__form">
          <form action={update} className="admin-form">
            <div className="admin-form__row">
              <label>
                <span>Title</span>
                <input name="title" type="text" defaultValue={poster.title} required />
              </label>
              <label>
                <span>Number</span>
                <input name="number" type="text" defaultValue={poster.number} />
              </label>
            </div>
            <label>
              <span>Description</span>
              <textarea name="description" rows={3} defaultValue={poster.description} required />
            </label>
            <div className="admin-form__row">
              <label>
                <span>City</span>
                <select name="cityId" defaultValue={poster.cityId}>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Price (€)</span>
                <input
                  name="priceEur"
                  type="number"
                  min={1}
                  step={1}
                  defaultValue={poster.priceDigitalCents / 100}
                />
              </label>
            </div>
            <label>
              <span>Gallery</span>
              <select name="gallery" defaultValue={poster.gallery}>
                <option value="MAIN">Main gallery</option>
                <option value="MONDRIAN">Mondrian style</option>
              </select>
            </label>
            <label className="admin-form__checkbox">
              <input
                name="publish"
                type="checkbox"
                defaultChecked={poster.status === 'PUBLISHED'}
              />
              <span>Published (unchecked = draft)</span>
            </label>
            <button type="submit" className="admin-btn-primary">
              Save
            </button>
          </form>

          <form action={del} className="admin-danger-zone">
            <p className="admin-muted">Permanent. Removes the DB row only — files on the volume stay.</p>
            <button type="submit" className="admin-btn-danger">
              Delete poster
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
