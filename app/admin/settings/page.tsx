// Admin — site-wide settings.
// Currently just the hero poster picker; more toggles land here as needed.

import { prisma } from '@/lib/prisma';
import { getSiteSettings, setHeroPoster } from '@/lib/settings';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

async function saveHeroAction(formData: FormData) {
  'use server';
  const raw = formData.get('heroPosterId');
  const id = typeof raw === 'string' && raw.length > 0 ? raw : null;
  await setHeroPoster(id);
  // The home page reads this setting at request time, but revalidate the
  // route anyway so any ISR/data cache layers pick it up immediately.
  revalidatePath('/');
  revalidatePath('/admin/settings');
}

export default async function AdminSettingsPage() {
  const [settings, posters] = await Promise.all([
    getSiteSettings(),
    prisma.poster.findMany({
      where: { status: 'PUBLISHED' },
      include: { city: { select: { name: true } } },
      orderBy: [{ city: { name: 'asc' } }, { number: 'asc' }],
    }),
  ]);

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <h1>Settings</h1>
        <p className="admin-page__sub">
          Site-wide configuration. Changes are live immediately.
        </p>
      </header>

      <section className="admin-card">
        <h2>Home page hero</h2>
        <p className="admin-card__sub">
          The poster featured in the hero of the home page. If left unset, the
          newest published poster is used automatically.
        </p>

        {posters.length === 0 ? (
          <p className="admin-empty">
            No published posters yet. Publish one in <a href="/admin/posters">Posters</a>
            {' '}to choose a hero.
          </p>
        ) : (
          <form action={saveHeroAction} className="admin-form">
            <label className="admin-form__row">
              <span className="admin-form__label">Featured poster</span>
              <select
                name="heroPosterId"
                defaultValue={settings.heroPosterId ?? ''}
                className="admin-form__select"
              >
                <option value="">— Newest published (default) —</option>
                {posters.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.city.name} · {p.number} — {p.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="admin-form__actions">
              <button type="submit" className="admin-btn admin-btn--primary">
                Save
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
