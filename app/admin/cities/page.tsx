import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { CityStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

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

export default async function AdminCitiesPage() {
  const cities = await prisma.city.findMany({
    orderBy: { number: 'asc' },
    include: { _count: { select: { posters: true } } },
  });

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <p className="admin-page__eyebrow">Catalog</p>
          <h1>Cities</h1>
          <p className="admin-page__sub">Curate each city&apos;s status and copy.</p>
        </div>
      </header>

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
