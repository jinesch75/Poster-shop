'use client';

// "What you can do with your file" strip on the product page: a
// horizontally scrolling row of example mockups. Clicking one opens it
// large in a native <dialog>; arrow keys / buttons step through, Esc or
// a click outside closes.

import { useCallback, useEffect, useRef, useState } from 'react';
import { ProtectedImage } from './ProtectedImage';
import type { Idea } from '@/lib/ideas';

export function IdeasStrip({ ideas, posterTitle }: { ideas: Idea[]; posterTitle: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<number | null>(null);

  const show = useCallback((i: number) => {
    setOpen(i);
    dialogRef.current?.showModal();
  }, []);
  const close = useCallback(() => {
    dialogRef.current?.close();
  }, []);
  const step = useCallback(
    (d: number) => setOpen((i) => (i === null ? i : (i + d + ideas.length) % ideas.length)),
    [ideas.length],
  );

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const onClose = () => setOpen(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    dlg.addEventListener('close', onClose);
    dlg.addEventListener('keydown', onKey);
    return () => {
      dlg.removeEventListener('close', onClose);
      dlg.removeEventListener('keydown', onKey);
    };
  }, [step]);

  const current = open === null ? null : ideas[open];

  return (
    <>
      <ul className="ideas__strip">
        {ideas.map((idea, i) => (
          <li key={idea.key} className="ideas__item">
            <button
              type="button"
              className="ideas__thumb"
              onClick={() => show(i)}
              aria-label={`${idea.title} — view larger`}
            >
              <ProtectedImage
                src={idea.src}
                alt={`${posterTitle} as ${idea.title.toLowerCase()}`}
                width={1200}
                height={900}
                sizes="(max-width: 700px) 70vw, 300px"
                loading="lazy"
              />
            </button>
            <p className="ideas__title">{idea.title}</p>
            <p className="ideas__hint">{idea.hint}</p>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        className="ideas__dialog"
        onClick={(e) => {
          if (e.target === dialogRef.current) close(); // click on the backdrop
        }}
      >
        {current && (
          <figure className="ideas__figure">
            <ProtectedImage
              src={current.src}
              alt={`${posterTitle} as ${current.title.toLowerCase()}`}
              width={1200}
              height={900}
              sizes="(max-width: 1300px) 92vw, 1200px"
            />
            <figcaption>
              <span className="ideas__title">{current.title}</span>
              <span className="ideas__hint">{current.hint}</span>
            </figcaption>
            <div className="ideas__nav">
              <button type="button" onClick={() => step(-1)} aria-label="Previous">
                ←
              </button>
              <span className="ideas__count">
                {(open ?? 0) + 1} / {ideas.length}
              </span>
              <button type="button" onClick={() => step(1)} aria-label="Next">
                →
              </button>
              <button type="button" className="ideas__close" onClick={close} aria-label="Close">
                Close
              </button>
            </div>
          </figure>
        )}
      </dialog>
    </>
  );
}
