'use client';

// Drag-and-drop quick upload, used at the top of /admin/posters.
//
// Pairs with the runQuickUpload server action in app/admin/posters/actions.ts:
// the user picks a city once, drops one or more PNG/JPG files, and each
// one is run through the processMaster pipeline. They land as DRAFT
// posters with auto-generated metadata. Click into a draft to refine
// and publish. 50 MB cap per file.

import { useRef, useState, useTransition } from 'react';

type Props = {
  cities: { id: string; slug: string; name: string }[];
  /** Server action — `(formData) => Promise<void>` */
  action: (formData: FormData) => Promise<void> | void;
};

const VALID_TYPES = new Set(['image/png', 'image/jpeg']);
const MAX_FILE_BYTES = 50 * 1024 * 1024;

export function QuickUploadDropzone({ cities, action }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const cityRef = useRef<HTMLSelectElement>(null);

  function ingest(list: FileList | File[]) {
    const arr = Array.from(list);
    const rejected: string[] = [];
    const accepted: File[] = [];
    for (const f of arr) {
      if (!VALID_TYPES.has(f.type)) {
        rejected.push(`${f.name} — not a PNG or JPG`);
        continue;
      }
      if (f.size > MAX_FILE_BYTES) {
        rejected.push(`${f.name} — over 50MB limit`);
        continue;
      }
      accepted.push(f);
    }
    setFiles((prev) => [...prev, ...accepted]);
    setError(rejected.length ? rejected.join(' · ') : null);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) ingest(e.dataTransfer.files);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!files.length) return;
    if (!cityRef.current?.value) {
      setError('Pick a city first.');
      return;
    }

    const fd = new FormData();
    fd.set('cityId', cityRef.current.value);
    for (const f of files) fd.append('files', f);

    startTransition(async () => {
      await action(fd);
      // The server action redirects to ?report=… on success, so this
      // line is rarely reached — but if it is, clear the chosen files.
      setFiles([]);
      formRef.current?.reset();
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="quick-upload"
      encType="multipart/form-data"
    >
      <div className="quick-upload__row">
        <label className="quick-upload__city">
          <span>City</span>
          <select ref={cityRef} name="cityId" defaultValue="" required>
            <option value="" disabled>
              Choose a city
            </option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        className={`quick-upload__drop${dragOver ? ' quick-upload__drop--over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Drop master files here or click to browse"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          multiple
          hidden
          onChange={(e) => e.target.files && ingest(e.target.files)}
        />
        <p className="quick-upload__drop-text">
          {files.length
            ? `${files.length} file${files.length === 1 ? '' : 's'} selected`
            : 'Drop PNG / JPG masters here, or click to browse'}
        </p>
        <p className="quick-upload__drop-hint">
          Up to 50 MB per file. Filename becomes the slug (spaces and
          underscores → hyphens). Imports as DRAFT — refine and publish from{' '}
          <code>/admin/posters</code>.
        </p>
      </div>

      {files.length > 0 && (
        <ul className="quick-upload__list">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`}>
              <code>{f.name}</code>
              <span className="quick-upload__size">
                {(f.size / (1024 * 1024)).toFixed(1)} MB
              </span>
              <button
                type="button"
                className="quick-upload__remove"
                onClick={() =>
                  setFiles((prev) => prev.filter((_, j) => j !== i))
                }
                aria-label={`Remove ${f.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="admin-banner admin-banner--error" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="admin-btn-primary"
        disabled={files.length === 0 || isPending}
      >
        {isPending
          ? `Uploading ${files.length} file${files.length === 1 ? '' : 's'}…`
          : `Upload ${files.length} file${files.length === 1 ? '' : 's'}`}
      </button>
    </form>
  );
}
