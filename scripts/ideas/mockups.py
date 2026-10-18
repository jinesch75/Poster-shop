"""Product mockups for a Gridline Cities poster.

Usage: python3 mockups.py <master.png> <out_dir>

Renders five 1600x1200 scenes on the shop's warm off-white:
wall art, mug, t-shirt, bookmark, iPhone wallpaper - plus a contact sheet.
Everything is drawn procedurally from the artwork (no stock photos).
"""
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

SRC = OUT = None

W, H = 1600, 1200
SS = 2  # supersampling for crisp shapes
PAPER = (243, 239, 231)
INK = (42, 39, 36)
FONT_DIR = Path('/usr/share/fonts/opentype/inter')

art = None
AW = AH = 0


def setup(image, out):
    global art, AW, AH, OUT
    art, OUT = image, Path(out)
    AW, AH = art.size
    OUT.mkdir(parents=True, exist_ok=True)


# ---------- helpers ----------

def background(top=(246, 243, 236), bottom=(236, 231, 222)):
    g = np.linspace(0, 1, H)[:, None, None]
    a = np.array(top, float)[None, None, :]
    b = np.array(bottom, float)[None, None, :]
    img = a * (1 - g) + b * g
    img = np.repeat(img, W, axis=1)
    # soft vignette
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt(((xx - W / 2) / (W * 0.75)) ** 2 + ((yy - H / 2) / (H * 0.75)) ** 2)
    img *= (1 - 0.06 * np.clip(d, 0, 1) ** 2)[..., None]
    return Image.fromarray(img.clip(0, 255).astype(np.uint8))


def shadow(mask, offset=(0, 18), blur=28, opacity=0.35):
    """Soft drop shadow (RGBA) from an L mask the size of the canvas."""
    m = mask.filter(ImageFilter.GaussianBlur(blur))
    m = ImageChops.offset(m, *offset)
    m = m.point(lambda v: int(v * opacity))
    s = Image.new('RGBA', mask.size, (40, 32, 24, 0))
    s.putalpha(m)
    return s


def rounded_mask(size, box, radius):
    m = Image.new('L', (size[0] * SS, size[1] * SS), 0)
    x0, y0, x1, y1 = [v * SS for v in box]
    ImageDraw.Draw(m).rounded_rectangle((x0, y0, x1, y1), radius * SS, fill=255)
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


def font(name, size):
    return ImageFont.truetype(str(FONT_DIR / name), size)


def save(img, name):
    p = OUT / name
    img.convert('RGB').save(p, quality=92)
    return p


# ---------- 1. Wall art ----------

def wall_art():
    # warm plaster wall + oak floor strip
    bg = background((236, 231, 222), (226, 220, 209))
    d = ImageDraw.Draw(bg)
    floor_y = 1010
    d.rectangle((0, floor_y, W, H), fill=(196, 170, 136))
    for i in range(0, W, 180):  # floor boards
        d.line((i, floor_y, i - 60, H), fill=(184, 158, 124), width=2)
    d.rectangle((0, floor_y - 14, W, floor_y), fill=(240, 236, 228))  # skirting

    # frame: 50x70 proportion, black frame, white mat
    fh = 720
    fw = int(fh * 5 / 7)
    x0, y0 = (W - fw) // 2, 120
    frame_box = (x0, y0, x0 + fw, y0 + fh)
    m = rounded_mask((W, H), frame_box, 3)
    bg = Image.alpha_composite(bg.convert('RGBA'), shadow(m, (10, 22), 26, 0.45))
    d = ImageDraw.Draw(bg)
    d.rectangle(frame_box, fill=(28, 26, 24))
    border = 16
    mat = (x0 + border, y0 + border, x0 + fw - border, y0 + fh - border)
    d.rectangle(mat, fill=(250, 248, 244))
    pad = 58
    win = (mat[0] + pad, mat[1] + pad, mat[2] - pad, mat[3] - pad)
    pw, ph = win[2] - win[0], win[3] - win[1]
    poster = crop_aspect(art, pw / ph).resize((pw, ph), Image.LANCZOS)
    bg.paste(poster, win[:2])
    # mat bevel + glass sheen
    d.rectangle(win, outline=(214, 208, 198), width=2)
    sheen = Image.new('L', (W, H), 0)
    ImageDraw.Draw(sheen).polygon(
        [(x0 + 30, y0 + 20), (x0 + 230, y0 + 20), (x0 + 60, y0 + fh - 20), (x0 - 140, y0 + fh - 20)], fill=28)
    sheen = ImageChops.multiply(sheen.filter(ImageFilter.GaussianBlur(30)), m)
    white = Image.new('RGBA', (W, H), (255, 255, 255, 0))
    white.putalpha(sheen)
    bg = Image.alpha_composite(bg, white)

    # small bench + vase to give scale
    d = ImageDraw.Draw(bg)
    bench = (520, 900, 1080, 930)
    bm = rounded_mask((W, H), bench, 6)
    bg = Image.alpha_composite(bg, shadow(bm, (0, 40), 22, 0.3))
    d = ImageDraw.Draw(bg)
    d.rounded_rectangle(bench, 6, fill=(150, 116, 82))
    d.rectangle((560, 930, 580, floor_y), fill=(132, 101, 70))
    d.rectangle((1020, 930, 1040, floor_y), fill=(132, 101, 70))
    d.ellipse((900, 820, 960, 902), fill=(214, 208, 198))
    d.rectangle((918, 790, 942, 830), fill=(214, 208, 198))
    return save(bg, '1-wall-art.jpg')


# ---------- 2. Mug ----------

def mug():
    bg = background().convert('RGBA')
    bw, bh = 520, 600                    # body
    cx, top = 700, 300
    x0, x1 = cx - bw // 2, cx + bw // 2
    rim_h = 70
    yb = top + bh

    # shadow under mug
    sm = Image.new('L', (W, H), 0)
    ImageDraw.Draw(sm).ellipse((x0 - 30, yb - 40, x1 + 190, yb + 50), fill=255)
    bg = Image.alpha_composite(bg, shadow(sm, (20, 10), 30, 0.35))

    # handle (behind body on the right)
    hd = ImageDraw.Draw(bg)
    hx0, hy0, hx1, hy1 = x1 - 70, top + 120, x1 + 170, top + 440
    hd.ellipse((hx0, hy0, hx1, hy1), outline=(232, 229, 223), width=58)
    hd.arc((hx0 + 6, hy0 + 6, hx1 - 6, hy1 - 6), -70, 70, fill=(250, 249, 246), width=16)
    hd.arc((hx0, hy0, hx1, hy1), 20, 80, fill=(205, 200, 192), width=20)

    # body: columns shaded like a cylinder
    u = np.linspace(-1, 1, bw)
    shade = 0.80 + 0.20 * np.sqrt(1 - u ** 2)
    shade += 0.10 * np.exp(-((u + 0.45) / 0.10) ** 2)      # specular stripe
    shade -= 0.10 * np.clip(u, 0, 1) ** 2                    # far side falls off
    body = np.ones((bh, bw, 3)) * np.array([248, 247, 244])
    body *= shade[None, :, None]

    # wrapped print: visible half of the wrap, cylindrically projected
    pt, pb = 70, bh - 60                                     # print band in body
    band_h = pb - pt
    vis = crop_aspect(art, (bw * math.pi / 2) / band_h, cy=0.55)
    vis = vis.resize((int(bw * math.pi / 2), band_h), Image.LANCZOS)
    va = np.asarray(vis, float)
    src_x = ((np.arcsin(u) / (math.pi / 2)) * 0.5 + 0.5) * (va.shape[1] - 1)
    warped = va[:, src_x.astype(int), :]
    body[pt:pb] = warped * (shade[None, :, None] * 0.98)

    body_img = Image.fromarray(body.clip(0, 255).astype(np.uint8))
    bmask = Image.new('L', (bw * SS, (bh + rim_h) * SS), 0)
    md = ImageDraw.Draw(bmask)
    md.rectangle((0, rim_h // 2 * SS, bw * SS, (bh - 25) * SS), fill=255)
    md.ellipse((0, (bh - 60) * SS, bw * SS, (bh + 10) * SS), fill=255)   # rounded base
    bmask = bmask.resize((bw, bh + rim_h), Image.LANCZOS).crop((0, 0, bw, bh))
    bg.paste(body_img, (x0, top), bmask)

    # rim + inside
    rd = ImageDraw.Draw(bg)
    rd.ellipse((x0, top, x1, top + rim_h), fill=(250, 249, 246))
    rd.ellipse((x0 + 14, top + 10, x1 - 14, top + rim_h - 8), fill=(214, 209, 201))
    rd.chord((x0 + 14, top + 10, x1 - 14, top + rim_h - 8), 180, 360, fill=(196, 190, 181))
    return save(bg, '2-mug.jpg')


# ---------- 3. T-shirt ----------

def tshirt():
    bg = background().convert('RGBA')
    cx = W // 2
    # right half outline (x offset from centre, y), mirrored for the left
    right = [(90, 120), (175, 138), (262, 168), (360, 222), (468, 330), (418, 400), (372, 452),
             (318, 418), (272, 398), (276, 620), (282, 860), (288, 1060), (0, 1072)]
    pts = [(cx + x, y) for x, y in right] + [(cx - x, y) for x, y in reversed(right[:-1])]
    neck = [(cx - 90, 120)] + [(cx + 90 * math.cos(t), 120 + 60 * math.sin(t))
                               for t in np.linspace(math.pi, 0, 30)]
    mask = Image.new('L', (W * SS, H * SS), 0)
    md = ImageDraw.Draw(mask)
    md.polygon([(x * SS, y * SS) for x, y in pts], fill=255)
    md.polygon([(x * SS, y * SS) for x, y in neck], fill=0)
    mask = mask.resize((W, H), Image.LANCZOS)

    bg = Image.alpha_composite(bg, shadow(mask, (0, 14), 16, 0.28))

    # fabric: off-white with soft folds
    rng = np.random.default_rng(7)
    folds = Image.fromarray((rng.random((H // 40, W // 40)) * 255).astype(np.uint8))
    folds = folds.resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(45))
    f = np.asarray(folds, float) / 255
    fabric = np.ones((H, W, 3)) * np.array([240, 237, 231]) * (0.84 + 0.16 * f)[..., None]
    # long vertical drape folds
    xs = np.arange(W)[None, :]
    drape = 0.035 * np.sin(xs / 37.0) * np.sin(xs / 113.0 + 1.3)
    fabric *= (1 + drape)[..., None]
    # sleeves slightly darker (they turn away from the light)
    sleeve = np.zeros((H, W))
    sleeve[:, :cx - 272] = 1
    sleeve[:, cx + 272:] = 1
    fabric *= (1 - 0.05 * sleeve)[..., None]
    # side shading
    xx = np.linspace(-1, 1, W)[None, :]
    fabric *= (1 - 0.06 * np.abs(xx) ** 3)[..., None]
    # fine weave
    fabric *= (0.985 + 0.015 * rng.random((H, W)))[..., None]

    # chest print, multiplied into the fabric
    pw = 270
    ph = int(pw * AH / AW)
    px, py = cx - pw // 2, 300
    pr = np.asarray(art.resize((pw, ph), Image.LANCZOS), float) / 255
    region = fabric[py:py + ph, px:px + pw]
    fabric[py:py + ph, px:px + pw] = region * (0.06 + 0.94 * pr) * 1.02

    tee = Image.fromarray(fabric.clip(0, 255).astype(np.uint8)).convert('RGBA')
    tee.putalpha(mask)
    bg = Image.alpha_composite(bg, tee)

    # collar band + seams
    d = ImageDraw.Draw(bg)
    d.arc((cx - 90, 60, cx + 90, 180), 0, 180, fill=(212, 207, 199), width=14)
    for s in (1, -1):
        d.line([(cx + s * 262, 168), (cx + s * 272, 398)], fill=(218, 214, 206), width=3)
        d.line([(cx + s * 432, 372), (cx + s * 380, 438)], fill=(218, 214, 206), width=3)
    d.line([(cx - 284, 1040), (cx + 284, 1040)], fill=(222, 218, 210), width=2)
    return save(bg, '3-tshirt.jpg')


# ---------- 4. Bookmark ----------

def bookmark():
    bg = background().convert('RGBA')

    # closed linen book under the bookmark
    book = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(book)
    bd.rounded_rectangle((470, 230, 1130, 1060), 10, fill=(232, 228, 220))     # pages
    bd.rounded_rectangle((455, 215, 1115, 1045), 12, fill=(64, 72, 82))         # cover
    for y in range(225, 1040, 6):                                               # linen texture
        bd.line((460, y, 1110, y), fill=(70, 78, 88), width=1)
    book = book.rotate(4, resample=Image.BICUBIC, center=(800, 640))
    bg = Image.alpha_composite(bg, shadow(book.getchannel('A'), (14, 22), 28, 0.40))
    bg = Image.alpha_composite(bg, book)

    # bookmark: 5 x 18 cm strip from the poster, rounded corners
    bw, bh = 320, 780
    strip = crop_aspect(art, bw / bh, cx=0.5).resize((bw, bh), Image.LANCZOS).convert('RGBA')
    m = rounded_mask((bw, bh), (0, 0, bw, bh), 16)
    hole = Image.new('L', (bw * SS, bh * SS), 255)
    ImageDraw.Draw(hole).ellipse(((bw / 2 - 12) * SS, 34 * SS, (bw / 2 + 12) * SS, 58 * SS), fill=0)
    m = ImageChops.multiply(m, hole.resize((bw, bh), Image.LANCZOS))
    strip.putalpha(m)
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    bx, by = 655, 210
    layer.paste(strip, (bx, by), strip)

    # tassel: thread loop + fringe in charcoal
    td = ImageDraw.Draw(layer)
    hx, hy = bx + bw // 2, by + 46
    td.line([(hx, hy), (hx - 40, hy - 70), (hx - 70, hy - 120)], fill=INK + (255,), width=5, joint='curve')
    for i in range(-10, 11, 2):
        td.line([(hx - 70, hy - 120), (hx - 70 + i * 3, hy - 230)], fill=INK + (255,), width=3)
    td.ellipse((hx - 82, hy - 134, hx - 58, hy - 108), fill=INK + (255,))

    layer = layer.rotate(-9, resample=Image.BICUBIC, center=(bx + bw // 2, by + bh // 2))
    bg = Image.alpha_composite(bg, shadow(layer.getchannel('A'), (10, 16), 14, 0.40))
    bg = Image.alpha_composite(bg, layer)
    return save(bg, '4-bookmark.jpg')


# ---------- 5. iPhone wallpaper ----------

def iphone():
    bg = background().convert('RGBA')
    pw, ph = 500, 1030
    x0, y0 = (W - pw) // 2, (H - ph) // 2
    body = (x0, y0, x0 + pw, y0 + ph)
    bm = rounded_mask((W, H), body, 78)
    bg = Image.alpha_composite(bg, shadow(bm, (0, 26), 34, 0.45))

    phone = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    pdr = ImageDraw.Draw(phone)
    # side buttons
    pdr.rounded_rectangle((x0 - 5, y0 + 190, x0 + 4, y0 + 250), 3, fill=(60, 60, 62))
    pdr.rounded_rectangle((x0 - 5, y0 + 275, x0 + 4, y0 + 355), 3, fill=(60, 60, 62))
    pdr.rounded_rectangle((x0 + pw - 4, y0 + 260, x0 + pw + 5, y0 + 380), 3, fill=(60, 60, 62))
    frame = Image.new('RGBA', (W, H), (36, 36, 38, 255))
    frame.putalpha(bm)
    phone = Image.alpha_composite(phone, frame)

    # screen with the wallpaper
    bez = 16
    sx0, sy0, sx1, sy1 = x0 + bez, y0 + bez, x0 + pw - bez, y0 + ph - bez
    sw, sh = sx1 - sx0, sy1 - sy0
    wp = crop_aspect(art, sw / sh, cx=0.5).resize((sw, sh), Image.LANCZOS)
    # soft light scrim behind the clock, as iOS does on busy wallpapers
    wa = np.asarray(wp, float)
    g = (np.clip(1 - np.linspace(0, 1, sh) / 0.30, 0, 1) ** 0.9)[:, None, None] * 0.82
    wa = wa * (1 - g) + np.array([246, 243, 236]) * g
    wp = Image.fromarray(wa.clip(0, 255).astype(np.uint8)).convert('RGBA')
    wp.putalpha(rounded_mask((sw, sh), (0, 0, sw, sh), 62))
    phone.paste(wp, (sx0, sy0), wp)

    # lock screen overlay
    over = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(over)
    # dynamic island
    od.rounded_rectangle((W // 2 - 62, sy0 + 18, W // 2 + 62, sy0 + 54), 18, fill=(8, 8, 8, 255))
    txt = INK + (235,)
    f_date = font('Inter-SemiBold.otf', 24)
    f_time = font('InterDisplay-SemiBold.otf', 120) if (FONT_DIR / 'InterDisplay-SemiBold.otf').exists() else font('Inter-SemiBold.otf', 120)
    od.text((W // 2, sy0 + 112), 'Saturday 18 October', font=f_date, fill=txt, anchor='mm')
    od.text((W // 2, sy0 + 200), '9:41', font=f_time, fill=txt, anchor='mm')
    # bottom controls + home indicator
    for cxp in (sx0 + 70, sx1 - 70):
        od.ellipse((cxp - 30, sy1 - 120, cxp + 30, sy1 - 60), fill=(30, 28, 26, 110))
    od.rounded_rectangle((W // 2 - 70, sy1 - 26, W // 2 + 70, sy1 - 18), 4, fill=INK + (220,))
    phone = Image.alpha_composite(phone, over)
    bg = Image.alpha_composite(bg, phone)
    return save(bg, '5-iphone-wallpaper.jpg')


if __name__ == '__main__':
    setup(Image.open(sys.argv[1]).convert('RGB'), sys.argv[2])
    paths = [wall_art(), mug(), tshirt(), bookmark(), iphone()]

    # contact sheet: 3 + 2 grid
    tw, th = 800, 600
    sheet = Image.new('RGB', (tw * 3, th * 2), PAPER)
    for i, p in enumerate(paths):
        im = Image.open(p).resize((tw, th), Image.LANCZOS)
        r, c = divmod(i, 3)
        ox = c * tw if r == 0 else tw // 2 + c * tw
        sheet.paste(im, (ox, r * th))
    sheet.save(OUT / '0-overview.jpg', quality=90)
    print('\n'.join(str(p) for p in paths))
