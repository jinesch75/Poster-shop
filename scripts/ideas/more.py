"""Eight more mockups for a Gridline Cities poster.

Usage: python3 more.py <pictures_dir> <hero_filename> <out_dir>

laptop wallpaper, iPad wallpaper, postcard set, gallery wall, jigsaw
puzzle, tote bag, notebook, wall calendar. All 1600x1200, drawn
procedurally from the artwork.
"""
import calendar
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

W, H = 1600, 1200
SS = 2
INK = (42, 39, 36)
FONTS = Path('/usr/share/fonts/opentype/inter')
rng = np.random.default_rng(11)


art = OUT = None
SIB = []            # four sibling posters (same city where possible)
TITLE, CITY = '', ''


def setup(image, siblings, title, city, out):
    global art, SIB, TITLE, CITY, OUT
    art, SIB, TITLE, CITY, OUT = image, siblings, title, city, Path(out)
    OUT.mkdir(parents=True, exist_ok=True)


def font(name, size):
    return ImageFont.truetype(str(FONTS / name), size)


def background(top=(246, 243, 236), bottom=(234, 228, 218)):
    g = np.linspace(0, 1, H)[:, None, None]
    img = np.array(top, float) * (1 - g) + np.array(bottom, float) * g
    img = np.repeat(img, W, axis=1)
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt(((xx - W / 2) / (W * 0.8)) ** 2 + ((yy - H / 2) / (H * 0.8)) ** 2)
    img *= (1 - 0.07 * np.clip(d, 0, 1) ** 2)[..., None]
    return Image.fromarray(img.clip(0, 255).astype(np.uint8)).convert('RGBA')


def wall_and_floor(floor_y=1010, wall=((238, 233, 224), (228, 222, 211))):
    bg = background(*wall)
    d = ImageDraw.Draw(bg)
    d.rectangle((0, floor_y, W, H), fill=(198, 172, 138))
    for i in range(-200, W + 200, 170):
        d.line((i, floor_y, i - 70, H), fill=(186, 160, 126), width=2)
    d.rectangle((0, floor_y - 14, W, floor_y), fill=(242, 238, 230))
    return bg


def shadow(mask, offset=(0, 18), blur=26, opacity=0.35):
    m = mask.filter(ImageFilter.GaussianBlur(blur))
    m = ImageChops.offset(m, *offset).point(lambda v: int(v * opacity))
    s = Image.new('RGBA', mask.size, (40, 32, 24, 0))
    s.putalpha(m)
    return s


def rr_mask(size, box, radius):
    m = Image.new('L', (size[0] * SS, size[1] * SS), 0)
    ImageDraw.Draw(m).rounded_rectangle([v * SS for v in box], radius * SS, fill=255)
    return m.resize(size, Image.LANCZOS)


def edge_color(img):
    """Median colour of a thin ring around the image: the poster's own paper tone."""
    a = np.asarray(img.convert('RGB'))
    ring = np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3),
                           a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)])
    return tuple(int(v) for v in np.median(ring, axis=0))


def crop_aspect(img, aspect, cx=0.5, cy=0.5):
    """Bring img to width/height = aspect WITHOUT cropping: the whole poster is
    kept and centred, and the extra space is filled with the poster's own
    background tone (as you'd do when setting a portrait image as a wallpaper).
    cx / cy are kept for call-site compatibility and ignored."""
    w, h = img.size
    if abs(w / h - aspect) < 0.005:
        return img
    if w / h > aspect:
        nw, nh = w, int(round(w / aspect))
    else:
        nw, nh = int(round(h * aspect)), h
    canvas = Image.new('RGB', (nw, nh), edge_color(img))
    canvas.paste(img.convert('RGB'), ((nw - w) // 2, (nh - h) // 2))
    return canvas


def fit(img, w, h, cx=0.5, cy=0.5):
    return crop_aspect(img, w / h, cx, cy).resize((w, h), Image.LANCZOS)


def layer_rotated(tile, angle, center):
    """Return a full-canvas RGBA layer with `tile` (RGBA) rotated about its centre at `center`."""
    rot = tile.rotate(angle, resample=Image.BICUBIC, expand=True)
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    lay.paste(rot, (int(center[0] - rot.width / 2), int(center[1] - rot.height / 2)), rot)
    return lay


def place(bg, tile, angle, center, sh=(8, 16), blur=16, op=0.38):
    lay = layer_rotated(tile, angle, center)
    bg = Image.alpha_composite(bg, shadow(lay.getchannel('A'), sh, blur, op))
    return Image.alpha_composite(bg, lay)


def lock_screen(img, scale):
    """Add a light top scrim + date/time like a lock screen."""
    a = np.asarray(img.convert('RGB'), float)
    hgt = a.shape[0]
    g = (np.clip(1 - np.linspace(0, 1, hgt) / 0.30, 0, 1) ** 0.9)[:, None, None] * 0.80
    a = a * (1 - g) + np.array([246, 243, 236]) * g
    out = Image.fromarray(a.clip(0, 255).astype(np.uint8))
    d = ImageDraw.Draw(out)
    w = out.width
    d.text((w / 2, int(hgt * 0.085)), 'Saturday 18 October', font=font('Inter-SemiBold.otf', int(22 * scale)),
           fill=INK, anchor='mm')
    d.text((w / 2, int(hgt * 0.165)), '9:41', font=font('InterDisplay-SemiBold.otf', int(104 * scale)),
           fill=INK, anchor='mm')
    return out


def save(img, name):
    img.convert('RGB').save(OUT / name, quality=92)
    return OUT / name


# ---------------------------------------------------------------- 6. laptop

def laptop():
    bg = background((240, 236, 228), (228, 221, 210))
    d = ImageDraw.Draw(bg)
    desk_y = 850
    desk = np.linspace(0, 1, H - desk_y)[:, None, None]
    wood = (np.array([214, 194, 166]) * (1 - desk) + np.array([196, 174, 144]) * desk)
    gx = np.arange(W)[None, :, None]
    gy_ = np.arange(H - desk_y)[:, None, None]
    grain = 1 + 0.012 * np.sin(gx / 23 + 3 * np.sin(gy_ / 60 + gx / 400)) + 0.006 * np.sin(gx / 7.3)
    bg.paste(Image.fromarray((wood * grain).clip(0, 255).astype(np.uint8)).convert('RGBA'), (0, desk_y))

    sw, sh = 940, 588                      # 16:10 lid
    x0, y0 = (W - sw) // 2, desk_y - 30 - sh
    lid = (x0, y0, x0 + sw, y0 + sh)
    base = [(x0 - 70, desk_y - 30), (x0 + sw + 70, desk_y - 30), (x0 + sw + 92, desk_y - 6), (x0 - 92, desk_y - 6)]
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).polygon(base, fill=255)
    bg = Image.alpha_composite(bg, shadow(m, (0, 14), 16, 0.45))
    bg = Image.alpha_composite(bg, shadow(rr_mask((W, H), lid, 22), (0, 30), 40, 0.30))

    d = ImageDraw.Draw(bg)
    d.rounded_rectangle(lid, 22, fill=(30, 30, 32))
    bez = 14
    scr = (x0 + bez, y0 + bez, x0 + sw - bez, y0 + sh - bez - 20)
    ww, wh = scr[2] - scr[0], scr[3] - scr[1]
    wp = fit(art, ww, wh, cy=0.42)
    # menu bar
    mb = Image.new('RGBA', (ww, 22), (250, 248, 244, 150))
    wp = wp.convert('RGBA')
    wp.alpha_composite(mb, (0, 0))
    md = ImageDraw.Draw(wp)
    md.text((ww - 14, 11), 'Sat 18 Oct  9:41', font=font('Inter-Medium.otf', 12), fill=INK, anchor='rm')
    for i, wdt in enumerate((26, 34, 30, 40)):
        md.rounded_rectangle((16 + sum((26, 34, 30, 40)[:i]) + i * 14, 8, 16 + sum((26, 34, 30, 40)[:i]) + i * 14 + wdt, 14), 3,
                             fill=INK + (120,))
    wp.putalpha(rr_mask((ww, wh), (0, 0, ww, wh), 10))
    bg.paste(wp, scr[:2], wp)
    d.rounded_rectangle((W // 2 - 70, y0 + bez - 1, W // 2 + 70, y0 + bez + 20), 8, fill=(30, 30, 32))  # notch
    # chin + hinge
    d.rectangle((x0 + 6, y0 + sh - 22, x0 + sw - 6, y0 + sh - 4), fill=(36, 36, 38))
    # base: brushed aluminium
    bm = Image.new('L', (W, H), 0)
    ImageDraw.Draw(bm).polygon(base, fill=255)
    gy = np.linspace(0, 1, H)[:, None, None]
    alu = np.array([214, 214, 218]) * (1 - gy) + np.array([168, 168, 174]) * gy
    alu = np.repeat(alu, W, axis=1) * (1 + 0.01 * rng.standard_normal((1, W, 1)))
    alum = Image.fromarray(alu.clip(0, 255).astype(np.uint8)).convert('RGBA')
    alum.putalpha(bm)
    bg = Image.alpha_composite(bg, alum)
    d = ImageDraw.Draw(bg)
    d.line([base[0], base[1]], fill=(236, 236, 240), width=2)
    d.rounded_rectangle((W // 2 - 80, desk_y - 30, W // 2 + 80, desk_y - 22), 4, fill=(150, 150, 156))
    return save(bg, '6-laptop-wallpaper.jpg')


# ---------------------------------------------------------------- 7. iPad

def ipad():
    bg = background()
    tw, th = 660, 880
    x0, y0 = (W - tw) // 2, (H - th) // 2
    body = (x0, y0, x0 + tw, y0 + th)
    bm = rr_mask((W, H), body, 40)
    bg = Image.alpha_composite(bg, shadow(bm, (0, 26), 36, 0.42))
    frame = Image.new('RGBA', (W, H), (52, 52, 56, 255))
    frame.putalpha(bm)
    bg = Image.alpha_composite(bg, frame)
    d = ImageDraw.Draw(bg)
    d.rounded_rectangle((x0 + tw - 120, y0 - 4, x0 + tw - 60, y0 + 3), 3, fill=(70, 70, 74))   # top button
    bez = 26
    sw, sh = tw - 2 * bez, th - 2 * bez
    scr = lock_screen(fit(art, sw, sh), 1.25).convert('RGBA')
    sd = ImageDraw.Draw(scr)
    sd.rounded_rectangle((sw // 2 - 90, sh - 18, sw // 2 + 90, sh - 12), 3, fill=INK + (220,))
    scr.putalpha(rr_mask((sw, sh), (0, 0, sw, sh), 18))
    bg.paste(scr, (x0 + bez, y0 + bez), scr)
    d.ellipse((W // 2 - 4, y0 + 10, W // 2 + 4, y0 + 18), fill=(24, 24, 26))                  # camera
    return save(bg, '7-ipad-wallpaper.jpg')


# ---------------------------------------------------------------- 8. postcards

def card(img, w=318, h=450, border=14):
    c = Image.new('RGBA', (w, h), (252, 251, 248, 255))
    c.paste(fit(img, w - 2 * border, h - 2 * border), (border, border))
    c.putalpha(rr_mask((w, h), (0, 0, w, h), 4))
    return c


def card_back(w=450, h=318):
    c = Image.new('RGBA', (w, h), (252, 251, 248, 255))
    d = ImageDraw.Draw(c)
    d.line((w // 2, 30, w // 2, h - 30), fill=(205, 200, 192), width=2)
    d.text((24, 28), 'GRIDLINE CITIES', font=font('Inter-SemiBold.otf', 13), fill=INK)
    d.text((24, 48), TITLE if CITY == 'Other Cities' else f'{CITY} · {TITLE}', font=font('Inter-Regular.otf', 13), fill=(110, 104, 98))
    d.text((24, h - 30), 'gridlinecities.com', font=font('Inter-Regular.otf', 11), fill=(140, 134, 128))
    d.rectangle((w - 86, 24, w - 26, 96), outline=(190, 184, 176), width=2)                     # stamp box
    for i in range(4):
        y = 140 + i * 38
        d.line((w // 2 + 24, y, w - 26, y), fill=(210, 205, 198), width=2)
    c.putalpha(rr_mask((w, h), (0, 0, w, h), 4))
    return c


def postcards():
    bg = background()
    # kraft envelope
    ew, eh = 640, 450
    env = Image.new('RGBA', (ew, eh), (202, 170, 128, 255))
    ea = np.asarray(env, float)
    ea[..., :3] *= (1 + 0.04 * (rng.random((eh, ew, 1)) - 0.5))
    env = Image.fromarray(ea.clip(0, 255).astype(np.uint8))
    ed = ImageDraw.Draw(env)
    ed.line([(0, 0), (ew // 2, eh * 0.55), (ew, 0)], fill=(178, 146, 106), width=3)
    ed.line([(0, eh), (ew * 0.42, eh * 0.52)], fill=(186, 154, 114), width=2)
    ed.line([(ew, eh), (ew * 0.58, eh * 0.52)], fill=(186, 154, 114), width=2)
    env.putalpha(rr_mask((ew, eh), (0, 0, ew, eh), 6))
    bg = place(bg, env, 8, (1070, 470), (8, 18), 22, 0.30)

    fan = [(SIB[0], -17, (440, 640)), (SIB[1], -8, (600, 600)),
           (SIB[2], 8, (980, 600)), (SIB[3], 17, (1140, 640)), (art, 0, (790, 575))]
    for img, ang, ctr in fan:
        bg = place(bg, card(img), ang, ctr, (6, 14), 14, 0.36)
    bg = place(bg, card_back(), -6, (1190, 1000), (6, 12), 12, 0.32)
    return save(bg, '8-postcard-set.jpg')


# ---------------------------------------------------------------- 9. gallery wall

def framed(img, w, h, border=10, mat=0.11):
    f = Image.new('RGBA', (w, h), (26, 25, 24, 255))
    d = ImageDraw.Draw(f)
    d.rectangle((border, border, w - border, h - border), fill=(250, 248, 244))
    m = int(min(w, h) * mat)
    ix0, iy0, ix1, iy1 = border + m, border + m, w - border - m, h - border - m
    f.paste(fit(img, ix1 - ix0, iy1 - iy0), (ix0, iy0))
    d.rectangle((ix0, iy0, ix1, iy1), outline=(214, 208, 198), width=2)
    return f


def gallery_wall():
    bg = wall_and_floor()
    big = framed(art, 360, 504)
    small = [framed(im, 200, 267) for im in SIB[:4]]
    gap, cy = 34, 410
    lx = W // 2 - 180 - gap - 200
    rx = W // 2 + 180 + gap
    spots = [(big, (W // 2 - 180, cy - 252))]
    spots += [(small[0], (lx, cy - 267 - gap // 2)), (small[1], (lx, cy + gap // 2)),
              (small[2], (rx, cy - 267 - gap // 2)), (small[3], (rx, cy + gap // 2))]
    for tile, (x, y) in spots:
        m = Image.new('L', (W, H), 0)
        m.paste(255, (x, y, x + tile.width, y + tile.height))
        bg = Image.alpha_composite(bg, shadow(m, (8, 18), 20, 0.40))
        bg.paste(tile, (x, y), tile)
    # oak sideboard
    sb = (W // 2 - 470, 790, W // 2 + 470, 930)
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).rectangle(sb, fill=255)
    bg = Image.alpha_composite(bg, shadow(m, (0, 30), 24, 0.35))
    d = ImageDraw.Draw(bg)
    d.rectangle(sb, fill=(170, 134, 96))
    d.rectangle((sb[0], sb[1], sb[2], sb[1] + 8), fill=(186, 150, 110))
    for i in range(1, 4):
        x = sb[0] + i * (sb[2] - sb[0]) // 4
        d.line((x, sb[1] + 14, x, sb[3] - 8), fill=(150, 116, 80), width=2)
    for x in (sb[0] + 40, sb[2] - 48):
        d.rectangle((x, sb[3], x + 8, 1000), fill=(120, 92, 62))
    # objects on the sideboard: books + vase
    d.rectangle((sb[0] + 90, 760, sb[0] + 250, 790), fill=(64, 72, 82))
    d.rectangle((sb[0] + 100, 736, sb[0] + 236, 760), fill=(214, 206, 192))
    d.ellipse((sb[2] - 190, 700, sb[2] - 120, 790), fill=(222, 216, 206))
    d.rectangle((sb[2] - 168, 670, sb[2] - 142, 710), fill=(222, 216, 206))
    return save(bg, '9-gallery-wall.jpg')


# ---------------------------------------------------------------- 10. jigsaw

def edge_pts(p0, p1, tab, n=24):
    """Edge from p0 to p1 with a classic jigsaw knob; tab=+1/-1 picks the side, 0 = flat."""
    p0, p1 = np.array(p0, float), np.array(p1, float)
    v = p1 - p0
    L = np.linalg.norm(v)
    nrm = np.array([v[1], -v[0]]) / L
    if tab == 0:
        return [p0]
    local = [(0.0, 0.0), (0.39, 0.0), (0.41, 0.05)]
    cx_, cy_, r = 0.5, 0.20, 0.115
    for a in np.linspace(math.radians(222), math.radians(-42), n):
        local.append((cx_ + r * math.cos(a), cy_ + r * math.sin(a)))
    local += [(0.59, 0.05), (0.61, 0.0)]
    return [p0 + v * t + nrm * (k * tab * L) for t, k in local]


def jigsaw():
    bg = background((242, 238, 230), (226, 218, 206))
    cols, rows, cell = 9, 12, 60
    pw, ph = cols * cell, rows * cell
    ox, oy = 880, 200
    puzzle = fit(art, pw, ph)
    h_tabs = rng.choice([-1, 1], size=(rows + 1, cols))
    v_tabs = rng.choice([-1, 1], size=(rows, cols + 1))
    h_tabs[0, :] = h_tabs[-1, :] = 0
    v_tabs[:, 0] = v_tabs[:, -1] = 0

    def outline(r, c):
        x0, y0 = c * cell, r * cell
        x1, y1 = x0 + cell, y0 + cell
        pts = []
        pts += edge_pts((x0, y0), (x1, y0), -h_tabs[r, c])        # top, left->right (outward = up)
        pts += edge_pts((x1, y0), (x1, y1), -v_tabs[r, c + 1])    # right
        pts += edge_pts((x1, y1), (x0, y1), h_tabs[r + 1, c])     # bottom
        pts += edge_pts((x0, y1), (x0, y0), v_tabs[r, c])         # left
        return [tuple(p) for p in pts]

    def piece_mask(r, c, pad=24):
        m = Image.new('L', ((pw + 2 * pad) * SS, (ph + 2 * pad) * SS), 0)
        ImageDraw.Draw(m).polygon([((x + pad) * SS, (y + pad) * SS) for x, y in outline(r, c)], fill=255)
        return m.resize((pw + 2 * pad, ph + 2 * pad), Image.LANCZOS)

    # board shadow + puzzle
    pz = puzzle.convert('RGBA')
    missing = [(r, c) for r in range(8, 12) for c in range(5, 9) if (r + c) % 3 != 0] + [(7, 8), (11, 4)]
    hole = Image.new('L', (pw + 48, ph + 48), 0)
    for r, c in missing:
        hole = ImageChops.lighter(hole, piece_mask(r, c))
    hole = hole.crop((24, 24, 24 + pw, 24 + ph))
    pz.putalpha(ImageChops.invert(hole))
    # cut lines over the assembled part
    cuts = Image.new('RGBA', (pw * SS, ph * SS), (0, 0, 0, 0))
    cd = ImageDraw.Draw(cuts)
    for r in range(rows):
        for c in range(cols):
            pts = [(x * SS, y * SS) for x, y in outline(r, c)]
            cd.line(pts + [pts[0]], fill=(30, 26, 22, 140), width=3)
    cuts = cuts.resize((pw, ph), Image.LANCZOS)
    pz = Image.alpha_composite(pz, cuts)
    pz.putalpha(ImageChops.invert(hole))
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    lay.paste(pz, (ox, oy), pz)
    # inner shadow in the holes (pieces stand ~2mm proud of the table)
    bg = Image.alpha_composite(bg, shadow(lay.getchannel('A'), (3, 5), 4, 0.45))
    bg = Image.alpha_composite(bg, lay)

    # loose pieces
    loose = missing[:9]
    spots = [(520, 980), (610, 1050), (720, 960), (430, 1080), (800, 1080), (660, 900), (350, 960), (900, 1000),
             (560, 870)]
    for (r, c), (x, y), ang in zip(loose, spots, rng.uniform(-60, 60, len(loose))):
        pm = piece_mask(r, c)
        src = Image.new('RGBA', pm.size, (0, 0, 0, 0))
        src.paste(puzzle, (24, 24))
        src.putalpha(pm)
        bb = pm.getbbox()
        tile = src.crop(bb)
        if (r * 7 + c) % 5 == 0:                                   # one shows its grey back
            back = Image.new('RGBA', tile.size, (178, 172, 164, 255))
            back.putalpha(tile.getchannel('A'))
            tile = back
        bg = place(bg, tile, float(ang), (x, y), (3, 5), 4, 0.45)

    # box lid
    bw_, bh_ = 560, 400
    lid = Image.new('RGBA', (bw_, bh_ + 18), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lid)
    ld.rectangle((0, 18, bw_, bh_ + 18), fill=(222, 216, 206))       # side depth
    lid.paste(fit(art, bw_, bh_ - 56, cy=0.45), (0, 0))
    ld.rectangle((0, bh_ - 56, bw_, bh_), fill=(250, 248, 244))
    ld.text((22, bh_ - 28), 'GRIDLINE CITIES', font=font('Inter-SemiBold.otf', 18), fill=INK, anchor='lm')
    ld.text((bw_ - 22, bh_ - 28), f'{TITLE} · 1000 pieces', font=font('Inter-Regular.otf', 16),
            fill=(96, 90, 84), anchor='rm')
    bg = place(bg, lid, 7, (430, 380), (8, 20), 22, 0.40)
    return save(bg, '10-jigsaw-puzzle.jpg')


# ---------------------------------------------------------------- 11. tote bag

def tote():
    bg = background()
    cx = W // 2
    top, bot, half_t, half_b = 400, 1100, 300, 312
    canvas_col = np.array([233, 224, 205], float)
    body = [(cx - half_t, top), (cx + half_t, top), (cx + half_b, bot), (cx - half_b, bot)]
    m = Image.new('L', (W * SS, H * SS), 0)
    md = ImageDraw.Draw(m)
    md.polygon([(x * SS, y * SS) for x, y in body], fill=255)
    # handles: two loops (front pair), drawn as thick curves
    hmask = Image.new('L', (W * SS, H * SS), 0)
    hd = ImageDraw.Draw(hmask)
    back_h = Image.new('L', (W * SS, H * SS), 0)
    bd_ = ImageDraw.Draw(back_h)
    for dm, dx, dy in ((hd, 0, 0), (bd_, 26, -22)):
        pts = [((cx + dx - 150 * math.cos(t)) * SS, (top + 12 + dy - 290 * math.sin(t)) * SS)
               for t in np.linspace(0, math.pi, 80)]
        dm.line(pts, fill=255, width=38 * SS, joint='curve')
    hmask = hmask.resize((W, H), Image.LANCZOS)
    back_h = back_h.resize((W, H), Image.LANCZOS)
    back_h = ImageChops.subtract(back_h, hmask)
    m = m.resize((W, H), Image.LANCZOS)
    full = ImageChops.lighter(ImageChops.lighter(m, hmask), back_h)
    bg = Image.alpha_composite(bg, shadow(full, (6, 18), 22, 0.32))

    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    u = (xx - cx) / 310
    shade = 0.93 + 0.06 * np.cos(np.clip(u, -1.2, 1.2) * 1.3) - 0.04 * u
    # soft vertical folds + a sag in the middle
    shade *= 1 + 0.03 * np.sin(xx / 41 + 0.7) * np.exp(-((yy - 780) / 260) ** 2)
    shade *= 1 - 0.05 * np.exp(-(((xx - cx) / 240) ** 2 + ((yy - 1060) / 40) ** 2))
    weave = 1 + 0.035 * (np.sin(xx * 1.9) * np.sin(yy * 1.9)) + 0.03 * (rng.random((H, W)) - 0.5)
    tex = canvas_col * (shade * weave)[..., None]
    # print: multiply (ink on natural canvas, white of the art disappears)
    pw = 360
    ph = int(pw * art.height / art.width)
    px0, py0 = cx - pw // 2, 520
    pr = np.asarray(art.resize((pw, ph), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.5)), float) / 255
    pr = 1 - (1 - pr) * 0.92
    tex[py0:py0 + ph, px0:px0 + pw] *= pr
    tote_img = Image.fromarray(tex.clip(0, 255).astype(np.uint8)).convert('RGBA')
    tote_img.putalpha(m)
    handles = Image.fromarray((canvas_col * 0.90 * weave[..., None]).clip(0, 255).astype(np.uint8)).convert('RGBA')
    handles.putalpha(hmask)
    backs = Image.fromarray((canvas_col * 0.80 * weave[..., None]).clip(0, 255).astype(np.uint8)).convert('RGBA')
    backs.putalpha(back_h)
    bg = Image.alpha_composite(bg, backs)
    bg = Image.alpha_composite(bg, handles)
    bg = Image.alpha_composite(bg, tote_img)
    d = ImageDraw.Draw(bg)
    # top hem + stitching, handle stitches
    d.line((cx - half_t, top + 46, cx + half_t, top + 46), fill=(214, 204, 184), width=2)
    for x in range(cx - half_t + 8, cx + half_t - 8, 14):
        d.line((x, top + 40, x + 7, top + 40), fill=(205, 194, 172), width=2)
    for sx in (-1, 1):
        x = cx + sx * 150
        d.rectangle((x - 19, top + 6, x + 19, top + 60), fill=tuple(int(v * 0.9) for v in canvas_col))
        d.rectangle((x - 19, top + 6, x + 19, top + 60), outline=(210, 199, 178), width=2)
        d.line((x - 19, top + 6, x + 19, top + 60), fill=(200, 189, 168), width=2)
        d.line((x + 19, top + 6, x - 19, top + 60), fill=(200, 189, 168), width=2)
    return save(bg, '11-tote-bag.jpg')


# ---------------------------------------------------------------- 12. notebook

def notebook():
    # linen desk, seen from above
    base = np.ones((H, W, 3)) * np.array([226, 220, 208])
    yy, xx = np.mgrid[0:H, 0:W]
    base *= (1 + 0.02 * np.sin(xx * 1.3) * np.sin(yy * 1.1) + 0.02 * (rng.random((H, W)) - 0.5))[..., None]
    bg = Image.fromarray(base.clip(0, 255).astype(np.uint8)).convert('RGBA')

    nw, nh = 470, 664                                   # A5
    nb = Image.new('RGBA', (nw + 10, nh + 10), (0, 0, 0, 0))
    d = ImageDraw.Draw(nb)
    d.rounded_rectangle((10, 10, nw + 10, nh + 10), 10, fill=(238, 232, 220))       # page block peeking out
    cover = fit(art, nw - 28, nh)
    nb.paste(cover, (28, 0))
    d.rectangle((0, 0, 28, nh), fill=(52, 58, 66))                                   # cloth spine
    for y in range(0, nh, 4):
        d.line((0, y, 28, y), fill=(58, 64, 72), width=1)
    d.line((28, 0, 28, nh), fill=(36, 40, 46), width=2)
    # elastic band
    d.rectangle((nw - 52, 0, nw - 40, nh), fill=(44, 42, 40))
    d.line((nw - 50, 0, nw - 50, nh), fill=(84, 80, 76), width=2)
    nm = rr_mask(nb.size, (0, 0, nw, nh), 10)
    nm = ImageChops.lighter(nm, rr_mask(nb.size, (10, 10, nw + 10, nh + 10), 10))
    nb.putalpha(ImageChops.multiply(nb.getchannel('A'), nm))
    bg = place(bg, nb, -7, (700, 600), (12, 20), 22, 0.40)

    # pencil
    pl, pr_ = 640, 16
    pen = Image.new('RGBA', (pl, pr_ * 2), (0, 0, 0, 0))
    pd = ImageDraw.Draw(pen)
    for i in range(pr_ * 2):
        v = 0.75 + 0.25 * math.sin(math.pi * i / (pr_ * 2))
        pd.line((40, i, pl - 34, i), fill=(int(48 * v), int(50 * v), int(54 * v), 255))
    pd.polygon([(40, 0), (40, pr_ * 2), (0, pr_)], fill=(214, 186, 150))              # sharpened wood
    pd.polygon([(12, pr_ - 5), (12, pr_ + 5), (0, pr_)], fill=(40, 38, 36))           # graphite
    pd.rectangle((pl - 34, 0, pl - 14, pr_ * 2), fill=(176, 170, 160))               # ferrule
    pd.rounded_rectangle((pl - 16, 0, pl, pr_ * 2), 6, fill=(214, 206, 196))          # eraser
    bg = place(bg, pen, 68, (1180, 610), (8, 12), 8, 0.40)
    return save(bg, '12-notebook.jpg')


# ---------------------------------------------------------------- 13. calendar

def wall_calendar():
    bg = wall_and_floor(floor_y=1130)
    cw, ch = 620, 960
    x0, y0 = (W - cw) // 2, 150
    cal = Image.new('RGBA', (cw, ch + 10), (0, 0, 0, 0))
    d = ImageDraw.Draw(cal)
    for k in (3, 2, 1):                                               # pages behind
        d.rectangle((k, 8 + k * 3, cw - k, ch + k * 3), fill=(238 - k * 6, 235 - k * 6, 229 - k * 6, 255))
    d.rectangle((0, 8, cw, ch), fill=(252, 251, 248))
    pad = 26
    iw, ih = cw - 2 * pad, 470
    cal.paste(fit(art, iw, ih, cy=0.42), (pad, 26))
    d.text((pad, 538), 'OCTOBER', font=font('Inter-SemiBold.otf', 34), fill=INK, anchor='ls')
    d.text((pad, 566), f'{TITLE} — Gridline Cities', font=font('Inter-Regular.otf', 15), fill=(130, 124, 118),
           anchor='ls')
    days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
    gx0, gy0 = pad, 610
    cwid = (cw - 2 * pad) / 7
    for i, dname in enumerate(days):
        d.text((gx0 + cwid * i + cwid / 2, gy0), dname, font=font('Inter-SemiBold.otf', 15),
               fill=(150, 144, 138), anchor='mm')
    d.line((pad, gy0 + 18, cw - pad, gy0 + 18), fill=(222, 217, 209), width=1)
    weeks = calendar.Calendar(firstweekday=0).monthdayscalendar(2026, 10)
    rowh = (ch - gy0 - 60) / len(weeks)
    for r, wk in enumerate(weeks):
        for c, day in enumerate(wk):
            if not day:
                continue
            cx_ = gx0 + cwid * c + cwid / 2
            cy_ = gy0 + 52 + r * rowh
            if day == 18:
                d.ellipse((cx_ - 22, cy_ - 22, cx_ + 22, cy_ + 22), outline=INK, width=2)
            d.text((cx_, cy_), str(day), font=font('Inter-Regular.otf', 22),
                   fill=(180, 60, 50) if c == 6 else INK, anchor='mm')
    # wire binding
    for x in range(30, cw - 20, 22):
        d.ellipse((x, 0, x + 10, 18), outline=(120, 120, 126), width=3)
    m = cal.getchannel('A')
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    lay.paste(cal, (x0, y0), cal)
    bg = Image.alpha_composite(bg, shadow(lay.getchannel('A'), (10, 22), 26, 0.40))
    bg = Image.alpha_composite(bg, lay)
    # hanger wire + nail
    d = ImageDraw.Draw(bg)
    d.line([(x0 + cw // 2 - 70, y0 + 6), (W // 2, y0 - 48), (x0 + cw // 2 + 70, y0 + 6)], fill=(110, 110, 116),
           width=3)
    d.ellipse((W // 2 - 7, y0 - 56, W // 2 + 7, y0 - 42), fill=(90, 86, 82))
    return save(bg, '13-wall-calendar.jpg')


ALL = (laptop, ipad, postcards, gallery_wall, jigsaw, tote, notebook, wall_calendar)
