import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { processMaster } from '@/lib/watermark';

export const metadata = { title: 'Upload poster — Linework Studio Admin' };
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

async function createPoster(formData: FormData) {
  'use server';

  const title = String(formData.get('title') ?? '').trim();
  const number = String(formData.get('number') ?? '').trim() || 'N°?';
  const description = String(formData.get('description') ?? '').trim();
  const cityId = String(formData.get('cityId') ?? '');
  const priceEur = Number(formData.get('priceEur') ?? 5);
  const publish = formData.get('publish') === 'on';
  const file = formData.get('file') as File | null;

  if (!title || !description || !cityId || !file || file.size === 0) {
    throw new Error('Missing required fields');
  }

  const ext = file.type === 'image/jpeg' ? 'jpg' : 'png';
  const buffer = Buffer.from(await file.arrayBuffer());

  const derivatives = await processMaster(buffer, ext);

  const slug = slugify(title);

  await prisma.poster.create({
    data: {
      slug,
      title,
      number,
      description,
      cityId,
      masterKey: derivatives.masterKey,
      previewKey: derivatives.previewKey,
      thumbnailKey: derivatives.thumbnailKey,
      mockupOfficeKey: derivatives.mockupOfficeKey,
      mockupLivingKey: derivatives.mockupLivingKey,
      masterWidthPx: derivatives.widthPx,
      masterHeightPx: derivatives.heightPx,
      priceDigitalCents: Math.round(priceEur * 100),
      status: publish ? 'PUBLISHED' : 'DRAFT',
    },
  });

  redirect('/admin/posters');
}

export default async function AdminNewPosterPage() {
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
