// Client-side wrapper around the reissueOrder server action.
// Shows inline feedback (useActionState) without reloading the page.

'use client';

import { useActionState } from 'react';
import { reissueOrder, type ReissueResult } from './actions';

export function ReissueButton({ orderId }: { orderId: string }) {
  const [state, formAction, pending] = useActionState<ReissueResult | null, FormData>(
    reissueOrder,
    null,
  );

  return (
    <form action={formAction} style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      <input type="hidden" name="orderId" value={orderId} />
      <button
        type="submit"
        disabled={pending}
        className="admin-btn-secondary"
        style={{ whiteSpace: 'nowrap' }}
      >
        {pending ? 'Re-issuing…' : 'Re-issue links'}
      </button>
      {state && (
        <span
          role="status"
          aria-live="polite"
          style={{
            fontSize: 12,
            color: state.ok ? 'var(--ink-soft)' : '#a33',
            maxWidth: 320,
          }}
        >
          {state.message}
        </span>
      )}
    </form>
  );
}
