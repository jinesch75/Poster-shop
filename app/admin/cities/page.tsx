import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { CityStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// Same slugify rule we use for posters — lower-case, ASCII-fold, dash-collapse.
function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

// Returns "06" given an existing max of "05". Pads to 2 digits to match the
// existing seed convention (N°01 … N°09); rolls naturally to "10", "11", …
async function nextCityNumber(): Promise<string> {
  const cities = await prisma.city.findMany({ select: { number: true } });
  const max = cities.reduce((acc: number, c: { number: string }) => {
    const n = parseInt(c.number, 10);
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  const next = max + 1;
  return next < 10 ? `0${next}` : String(next);
}

async function updateCity(id: string, formData: FormData) {
  'use server';
  await prisma.city.update({
    where: { id },
    data: {
      name: String(formData.get('name') ?? ''),
      statusLabel: String(formData.get('statusLabel') ?? '') || null,
      status: String(formData.get('status') ?? 'PLANNED') as CityStatus,
      description: String(formData.get('description') ?? '') || null,
    },
  });
  revalidatePath('/admin/cities');
}

// Inline-error redirect, matching the pattern in /admin/posters/new — throwing
// in a server action shows the white-screen "Application error" in production.
function failCreate(message: string): never {
  redirect(`/admin/cities?error=${encodeURIComponent(message)}`);
}

async function createCity(formData: FormData) {
  'use server';

  const name = String(formData.get('name') ?? '').trim();
  if (!name) failCreate('Name is required.');

  const slug = slugify(name);
  if (!slug) failCreate('Name must contain at least one letter or digit.');

  const existing = await prisma.city.findUnique({ where: { slug } });
  if (existing) failCreate(`A city with slug "${slug}" already exists.`);

  const status = String(formData.get('status') ?? 'PLANNED') as CityStatus;
  const statusLabel = String(formData.get('statusLabel') ?? '').trim() || null;
  const description = String(formData.get('description') ?? '').trim() || null;
  const number = await nextCityNumber();

  try {
    await prisma.city.create({
      data: { slug, name, number, status, statusLabel, description },
    });
  } catch (err) {
    // Defensive: catches the rare race where a duplicate slug appears
    // between the findUnique check above and the create call.
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code?: string }).code === 'P2002'
    ) {
      failCreate(`A city with slug "${slug}" already exists.`);
    }
    throw err;
  }

  revalidatePath('/admin/cities');
  revalidatePath('/');
  redirect(`/admin/cities?created=${encodeURIComponent(slug)}`);
}

export default async function AdminCitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const sp = await searchParams;
  const error = sp.error?.trim();
  const createdSlug = sp.created?.trim();

  const cities = await prisma.city.findMany({
    orderBy: { number: 'asc' },
    include: { _count: { select: { posters: true } } },
  });

  const createdCity = createdSlug
    ? cities.find((c: { slug: string }) => c.slug === createdSlug) ?? null
    : null;

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <p className="admin-page__eyebrow">Catalog</p>
          <h1>Cities</h1>
          <p className="admin-page__sub">Curate each city&apos;s status and copy.</p>
        </div>
      </header>

      {error && (
        <div className="admin-banner admin-banner--error" role="alert">
          {error}
        </div>
      )}
      {createdCity && (
        <div className="admin-banner admin-banner--success" role="status">
          Added {createdCity.name} (N°{createdCity.number}). Edit its details below.
        </div>
      )}

      <form action={createCity} className="admin-city admin-city--new">
        <div className="admin-city__head">
          <div>
            <span className="admin-city__num">+ New</span>
            <strong>Add a city</strong>
          </div>
          <span className="admin-muted">
            Slug and number are assigned automatically.
          </span>
        </div>
        <div className="admin-form__row">
          <label>
            <span>Display name</span>
            <input
              name="name"
              required
              placeholder="e.g. Berlin"
              autoComplete="off"
            />
          </label>
          <label>
            <span>Status</span>
            <select name="status" defaultValue="PLANNED">
              <option value="AVAILABLE">Available</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="PLANNED">Planned</option>
            </select>
          </label>
          <label>
            <span>Status label</span>
            <input name="statusLabel" placeholder="e.g. Summer 2027" />
          </label>
        </div>
        <label>
          <span>Description (optional)</span>
          <textarea
            name="description"
            rows={2}
            placeholder="A short blurb shown on the city page once it's available."
          />
        </label>
        <button type="submit" className="admin-btn-ghost">
          Create city
        </button>
      </form>

      <div className="admin-city-stack">
        {cities.map((c) => {
          const action = updateCity.bind(null, c.id);
          return (
            <form key={c.id} action={action} className="admin-city">
              <div className="admin-city__head">
                <div>
                  <span className="admin-city__num">N°{c.number}</span>
                  <strong>{c.name}</strong>
                </div>
                <span className="admin-muted">{c._count.posters} posters</span>
              </div>
              <div className="admin-form__row">
                <label>
                  <span>Display name</span>
                  <input name="name" defaultValue={c.name} />
                </label>
                <label>
                  <span>Status</span>
                  <select name="status" defaultValue={c.status}>
                    <option value="AVAILABLE">Available</option>
                    <option value="IN_PROGRESS">In progress</option>
                    <option value="PLANNED">Planned</option>
                  </select>
                </label>
                <label>
                  <span>Status label</span>
                  <input name="statusLabel" defaultValue={c.statusLabel ?? ''} />
                </label>
              </div>
              <label>
                <span>Description (optional)</span>
                <textarea name="description" rows={2} defaultValue={c.description ?? ''} />
              </label>
              <button type="submit" className="admin-btn-ghost">
                Save
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
