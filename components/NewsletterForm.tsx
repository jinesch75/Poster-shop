// Progressive-enhancement newsletter form.
// Uses React 19's useActionState — the form works without JS and upgrades
// to an inline success/error message when hydrated.

'use client';

import { useActionState } from 'react';
import { subscribe, type NewsletterResult } from '@/app/actions/newsletter';

export function NewsletterForm({ source = 'footer' }: { source?: string }) {
  const [state, formAction, pending] = useActionState<NewsletterResult | null, FormData>(
    subscribe,
    null,
  );

  return (
    <>
      <form action={formAction}>
        <input type="hidden" name="source" value={source} />
        <input
          type="email"
          name="email"
          placeholder="your@email.com"
          required
          aria-label="Email address"
          disabled={pending}
        />
        <button type="submit" disabled={pending}>
          {pending ? 'Subscribing…' : 'Subscribe'}
          <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
            <path d="M1 5h12M9 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>
      </form>
      {state && (
        <div
          className={`newsletter-feedback ${state.ok ? 'is-ok' : 'is-error'}`}
          role="status"
          aria-live="polite"
        >
          {state.message}
        </div>
      )}
    </>
  );
}
