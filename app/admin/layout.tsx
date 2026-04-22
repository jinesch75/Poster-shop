import '../admin.css';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/auth';
import { redirect } from 'next/navigation';

async function logout() {
  'use server';
  (await cookies()).set(ADMIN_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  redirect('/admin/login');
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Middleware already redirects unauthenticated requests, but the layout
  // runs for /admin/login too — skip the chrome there.
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  const signedIn = await verifyAdminToken(token);
  if (!signedIn) {
    // The login page renders its own layout.
    return <>{children}</>;
  }

  return (
    <div className="admin-shell">
      <aside className="admin-nav">
        <div className="admin-nav__brand">
          Linework <span className="studio-sub">Studio</span>
          <span className="admin-nav__tag">Admin</span>
        </div>
        <nav className="admin-nav__links">
          <Link href="/admin">Overview</Link>
          <Link href="/admin/posters">Posters</Link>
          <Link href="/admin/posters/new">Upload new</Link>
          <Link href="/admin/cities">Cities</Link>
        </nav>
        <div className="admin-nav__footer">
          <Link href="/" target="_blank" rel="noreferrer">
            View public site ↗
          </Link>
          <form action={logout}>
            <button type="submit" className="admin-nav__logout">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
