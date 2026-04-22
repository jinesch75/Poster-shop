import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE, signAdminToken, verifyAdminPassword, verifyAdminToken } from '@/lib/auth';

export const metadata = {
  title: 'Sign in — Linework Studio Admin',
};

async function login(formData: FormData) {
  'use server';
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/admin');

  if (!verifyAdminPassword(password)) {
    redirect('/admin/login?error=1' + (next ? `&next=${encodeURIComponent(next)}` : ''));
  }

  const token = await signAdminToken();
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });

  redirect(next.startsWith('/admin') ? next : '/admin');
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;

  // If already signed in, bounce to /admin.
  const existing = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (await verifyAdminToken(existing)) redirect(params.next ?? '/admin');

  return (
    <main className="admin-login">
      <div className="admin-login__card">
        <div className="admin-login__brand">
          Linework <span className="studio-sub">Studio</span>
        </div>
        <p className="admin-login__label">Admin access</p>
        <form action={login}>
          <input type="hidden" name="next" value={params.next ?? '/admin'} />
          <label htmlFor="password" className="admin-login__field-label">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="admin-login__input"
          />
          {params.error && (
            <p className="admin-login__error">That password didn&apos;t match.</p>
          )}
          <button type="submit" className="admin-login__submit">
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
