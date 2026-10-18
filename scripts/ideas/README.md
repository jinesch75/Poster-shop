# "What you can do with your file" mockups

The 13 example images on every product page (`public/ideas/<slug>/*.webp`,
listed in `lib/ideas-manifest.json`) are generated offline with these scripts.
They are drawn from each poster's **public, watermarked preview**, never the
clean master, so they carry the same watermark as every other public image.

Regenerate (Python 3 + Pillow + NumPy; fonts: Inter in /usr/share/fonts/opentype/inter):

```bash
cd scripts/ideas
python3 scrape.py                       # -> posters.json + previews/<slug>.jpg from the live site
python3 gen_all.py posters.json previews ../..            # all posters
python3 gen_all.py posters.json previews ../.. some-slug  # just one (e.g. a new upload)
```

`gen_all.py` merges into the existing manifest, so running it for one slug
keeps the others. Commit `public/ideas/` and `lib/ideas-manifest.json`.

A poster renamed on /admin/posters/rename keeps its examples (lib/ideas.ts
falls back to its old slugs). A poster with no entry simply doesn't show
the section.
