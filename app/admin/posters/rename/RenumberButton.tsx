'use client';

// Fills every "No." field on the rename table with N°01, N°02, … in the
// order the rows are shown. Nothing is saved until "Save all changes" is
// pressed, so the result can be reviewed (and tweaked) first. Changed
// fields are highlighted.

import { useState } from 'react';

export function RenumberButton({ formId, total }: { formId: string; total: number }) {
  const [filled, setFilled] = useState<number | null>(null);

  function fill() {
    const form = document.getElementById(formId);
    if (!form) return;
    const inputs = Array.from(
      form.querySelectorAll<HTMLInputElement>('input[data-number-field]'),
    );
    let changed = 0;
    inputs.forEach((input, i) => {
      const next = `N°${String(i + 1).padStart(2, '0')}`;
      const original = input.defaultValue;
      input.value = next;
      const isChanged = next !== original;
      input.classList.toggle('admin-rename__changed', isChanged);
      if (isChanged) changed += 1;
    });
    setFilled(changed);
  }

  return (
    <div className="admin-rename__renumber">
      <button type="button" className="admin-btn-ghost" onClick={fill}>
        Number in this order (N°01 → N°{String(total).padStart(2, '0')})
      </button>
      {filled !== null && (
        <span className="admin-muted">
          {filled === 0
            ? 'Numbers were already continuous — nothing to change.'
            : `${filled} number${filled === 1 ? '' : 's'} changed (highlighted). Review, then press Save all changes.`}
        </span>
      )}
    </div>
  );
}
