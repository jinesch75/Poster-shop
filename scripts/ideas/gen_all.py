"""Generate the 13 "what you can do with your file" mockups for every poster.

Usage: python3 gen_all.py <posters.json> <previews_dir> <repo_dir> [slug ...]

Source images are the site's public, watermarked previews, so the mockups
carry the same watermark as every other public image. Output:
  <repo>/public/ideas/<slug>/<key>.webp   (1200x900)
  <repo>/lib/ideas-manifest.json          ({ slug: [key, ...] })
"""
import json
import sys
import tempfile
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
import mockups  # noqa: E402
import more  # noqa: E402
import mug_tee  # noqa: E402

POSTERS = json.load(open(sys.argv[1]))
PREV = Path(sys.argv[2])
REPO = Path(sys.argv[3])
ONLY = set(sys.argv[4:])
OUT_W, OUT_H = 1200, 900

SCENES = [  # (key, module, function name, file the function writes)
    ('wall-art', mockups, 'wall_art', '1-wall-art.jpg'),
    ('phone-wallpaper', mockups, 'iphone', '5-iphone-wallpaper.jpg'),
    ('tablet-wallpaper', more, 'ipad', '7-ipad-wallpaper.jpg'),
    ('laptop-wallpaper', more, 'laptop', '6-laptop-wallpaper.jpg'),
    ('postcards', more, 'postcards', '8-postcard-set.jpg'),
    ('gallery-wall', more, 'gallery_wall', '9-gallery-wall.jpg'),
    ('calendar', more, 'wall_calendar', '13-wall-calendar.jpg'),
    ('bookmark', mockups, 'bookmark', '4-bookmark.jpg'),
    ('notebook', more, 'notebook', '12-notebook.jpg'),
    ('mug', mug_tee, 'mug', '2-mug.jpg'),
    ('t-shirt', mug_tee, 'tshirt', '3-tshirt.jpg'),
    ('tote-bag', more, 'tote', '11-tote-bag.jpg'),
    ('jigsaw', more, 'jigsaw', '10-jigsaw-puzzle.jpg'),
]


def siblings(p):
    """Four other posters: same city + gallery first, then same gallery, then anything."""
    others = [q for q in POSTERS if q['slug'] != p['slug']]
    tiers = [
        [q for q in others if q['city'] == p['city'] and q['gallery'] == p['gallery']],
        [q for q in others if q['city'] == p['city'] and q['gallery'] != p['gallery']],
        [q for q in others if q['gallery'] == p['gallery'] and q['city'] != p['city']],
        [q for q in others if q['gallery'] != p['gallery'] and q['city'] != p['city']],
    ]
    picked = []
    idx = POSTERS.index(p)
    for tier in tiers:
        if tier:
            k = idx % len(tier)                     # rotate so neighbours differ
            picked += tier[k:] + tier[:k]
        if len(picked) >= 4:
            break
    return picked[:4]


manifest_path = REPO / 'lib' / 'ideas-manifest.json'
manifest = json.load(open(manifest_path)) if manifest_path.exists() else {}

for p in POSTERS:
    if ONLY and p['slug'] not in ONLY:
        continue
    hero = Image.open(PREV / f"{p['slug']}.jpg").convert('RGB')
    sibs = [Image.open(PREV / f"{q['slug']}.jpg").convert('RGB') for q in siblings(p)]
    with tempfile.TemporaryDirectory() as tmp:
        mockups.setup(hero, tmp)
        mug_tee.setup(hero, tmp)
        more.setup(hero, sibs, p['title'], p['city'], tmp)
        dest = REPO / 'public' / 'ideas' / p['slug']
        dest.mkdir(parents=True, exist_ok=True)
        keys = []
        for key, mod, fn, fname in SCENES:
            getattr(mod, fn)()
            im = Image.open(Path(tmp) / fname).convert('RGB').resize((OUT_W, OUT_H), Image.LANCZOS)
            im.save(dest / f'{key}.webp', 'WEBP', quality=74, method=6)
            keys.append(key)
    manifest[p['slug']] = keys
    print(p['slug'], flush=True)

json.dump(dict(sorted(manifest.items())), open(manifest_path, 'w'), indent=1)
