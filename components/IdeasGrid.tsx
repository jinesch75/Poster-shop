'use client';

// "What you can do with your file" grid on the product page. The first
// example ("Print & frame") is a large 2×2 tile and the other twelve sit
// around it, so 13 images fill a 4-column grid (desktop) or a 2-column
// grid (mobile) without gaps. Each tile keeps the images' 4:3 shape and
// carries its title inside the picture. Clicking a tile opens it large in a
// native <dialog> with its hint; arrow keys / buttons step through, Esc or
// a click outside closes.

import { useCallback, useEffect, useRef, useState } from 'react';
import { ProtectedImage } from './ProtectedImage';
import type { Idea } from '@/lib/ideas';

export function IdeasGrid({ ideas, posterTitle }: { ideas: Idea[]; posterTitle: string }) {
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
      <ul className="ideas__grid">
        {ideas.map((idea, i) => (
          <li key={idea.key} className={i === 0 ? 'ideas__item ideas__item--lead' : 'ideas__item'}>
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
                sizes={
                  i === 0
                    ? '(max-width: 900px) 92vw, 40vw'
                    : '(max-width: 900px) 46vw, 20vw'
                }
                loading="lazy"
              />
              <span className="ideas__label">{idea.title}</span>
            </button>
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
