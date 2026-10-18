"""Higher-fidelity mug and t-shirt mockups.

Usage: python3 mug_tee.py <master.png> <out_dir>
"""
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

W, H = 1600, 1200
art = OUT = None
AW = AH = 0


def setup(image, out):
    global art, AW, AH, OUT
    art, OUT = image, Path(out)
    AW, AH = art.size
    OUT.mkdir(parents=True, exist_ok=True)
LIGHT = np.array([-0.50, -0.35, 0.79])          # from front-left, slightly above
LIGHT = LIGHT / np.linalg.norm(LIGHT)


def background(top=(246, 243, 236), bottom=(232, 226, 216)):
    g = np.linspace(0, 1, H)[:, None, None]
    img = np.array(top, float) * (1 - g) + np.array(bottom, float) * g
    img = np.repeat(img, W, axis=1)
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt(((xx - W / 2) / (W * 0.8)) ** 2 + ((yy - H / 2) / (H * 0.8)) ** 2)
    img *= (1 - 0.07 * np.clip(d, 0, 1) ** 2)[..., None]
    return img


def soft_shadow(canvas, mask, offset, blur, strength):
    m = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(blur))
    m = np.asarray(ImageChops.offset(m, *offset), float) / 255 * strength
    return canvas * (1 - m[..., None] * np.array([0.78, 0.80, 0.84]))


def crop_aspect(img, aspect, cx=0.5, cy=0.5):
    w, h = img.size
    if w / h > aspect:
        nw = int(h * aspect)
        x0 = int(np.clip(cx * w - nw / 2, 0, w - nw))
        return img.crop((x0, 0, x0 + nw, h))
    nh = int(w / aspect)
    y0 = int(np.clip(cy * h - nh / 2, 0, h - nh))
    return img.crop((0, y0, w, y0 + nh))


def to_img(a):
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


# =====================================================================
# MUG
# =====================================================================

def mug():
    S = 2                                   # render at 2x, downsample at the end
    Wc, Hc = W * S, H * S
    canvas = background()
    canvas = np.asarray(Image.fromarray(canvas.astype(np.uint8)).resize((Wc, Hc)), float)

    R, Hb, k = 255 * S, 560 * S, 0.17       # radius, body height, ellipse squash (camera above)
    cx, yt = 740 * S, 330 * S               # centre x, y of top-rim ellipse
    yb = yt + Hb
    er = k * R                              # half-height of rim ellipses
    ceramic = np.array([248, 247, 244], float)

    yy, xx = np.mgrid[0:Hc, 0:Wc].astype(float)

    # ---- shadows on the table (cast to the right, light from left)
    shadow_mask = (((xx - (cx + 0.55 * R)) / (1.55 * R)) ** 2 + ((yy - (yb + 0.2 * er)) / (1.9 * er)) ** 2) <= 1
    canvas = soft_shadow(canvas, shadow_mask.astype(float), (0, 0), 40 * S, 0.30)
    contact = (((xx - cx) / (1.02 * R)) ** 2 + ((yy - yb) / (1.05 * er)) ** 2) <= 1
    canvas = soft_shadow(canvas, contact.astype(float), (0, 6 * S), 10 * S, 0.45)

    # ---- handle: a tube along a half-ellipse on the right, shaded as a torus
    hcx, hcy = cx + R - 10 * S, yt + 0.47 * Hb
    hrx, hry, tube = 125 * S, 175 * S, 30 * S
    t = np.linspace(-math.pi / 2 - 0.25, math.pi / 2 + 0.25, 400)
    px = hcx + hrx * np.cos(t)
    py = hcy + hry * np.sin(t)
    x0, x1 = int(px.min() - tube - 2), int(px.max() + tube + 2)
    y0, y1 = int(py.min() - tube - 2), int(py.max() + tube + 2)
    sx, sy = xx[y0:y1, x0:x1], yy[y0:y1, x0:x1]
    best = np.full(sx.shape, np.inf)
    nx = np.zeros(sx.shape)
    ny = np.zeros(sx.shape)
    for qx, qy in zip(px, py):
        dx, dy = sx - qx, sy - qy
        d = dx * dx + dy * dy
        m = d < best
        best[m], nx[m], ny[m] = d[m], dx[m], dy[m]
    dist = np.sqrt(best)
    inside = dist < tube
    r = np.clip(dist / tube, 0, 1)
    nz = np.sqrt(1 - r ** 2)
    nlen = np.maximum(dist, 1e-6)
    N = np.stack([nx / nlen * r, ny / nlen * r, nz], -1)
    lam = np.clip((N * LIGHT).sum(-1), 0, 1)
    spec = np.clip((N * np.array([-0.35, -0.45, 0.82])).sum(-1), 0, 1) ** 40
    hcol = ceramic * (0.50 + 0.50 * lam)[..., None] + 255 * 0.55 * spec[..., None]
    alpha = np.clip((tube - dist) / 1.5, 0, 1)[..., None]
    region = canvas[y0:y1, x0:x1]
    canvas[y0:y1, x0:x1] = region * (1 - alpha) + hcol * alpha

    # ---- body
    u = np.clip((xx - cx) / R, -1, 1)
    s = np.sqrt(1 - u ** 2)
    in_x = np.abs(xx - cx) <= R
    top_front = yt + er * s
    bot_front = yb + er * s
    body = in_x & (yy >= top_front) & (yy <= bot_front)
    h = (yy - top_front) / Hb                          # 0 at rim, 1 at base

    N = np.stack([u, np.zeros_like(u), s], -1)
    lam = np.clip((N * LIGHT).sum(-1), 0, 1)
    shade = 0.46 + 0.54 * lam
    # ambient occlusion: under the rim lip and at the base
    shade *= 1 - 0.10 * np.exp(-h / 0.02) - 0.16 * np.exp(-(1 - h) / 0.03)
    spec = 0.30 * np.exp(-((u + 0.50) / 0.11) ** 2) + 0.12 * np.exp(-((u + 0.20) / 0.18) ** 2) \
        + 0.10 * np.exp(-((u - 0.86) / 0.04) ** 2)     # key light, soft fill, rim kick

    # wrapped print: front half of the wrap, white bands top and bottom
    band_top, band_bot = 0.10, 0.90
    vis_w = int(math.pi * R / S)
    vis_h = int((band_bot - band_top) * Hb / S)
    wrap = crop_aspect(art, vis_w / vis_h, cy=0.55).resize((vis_w, vis_h), Image.LANCZOS)
    wa = np.asarray(wrap, float)
    theta = np.arcsin(u)
    tx = ((theta / (math.pi / 2)) * 0.5 + 0.5) * (vis_w - 1)
    ty = (h - band_top) / (band_bot - band_top) * (vis_h - 1)
    in_band = body & (h >= band_top) & (h <= band_bot)
    surf = np.broadcast_to(ceramic, canvas.shape).copy()
    surf[in_band] = wa[ty[in_band].astype(int).clip(0, vis_h - 1), tx[in_band].astype(int).clip(0, vis_w - 1)]
    col = surf * shade[..., None] + 255 * spec[..., None]
    # anti-aliased silhouette
    edge_a = np.clip(np.minimum.reduce([yy - top_front + 1, bot_front - yy + 1, (R - np.abs(xx - cx)) / 1.0]), 0, 1)
    a = (edge_a * in_x)[..., None]
    canvas = canvas * (1 - a) + col * a

    # ---- rim and opening
    rim_out = ((xx - cx) / R) ** 2 + ((yy - yt) / er) ** 2
    lip = 12 * S
    rim_in = ((xx - cx) / (R - lip)) ** 2 + ((yy - yt) / (er - lip * k)) ** 2
    rim = (rim_out <= 1) & (rim_in > 1)
    canvas[rim] = ceramic * 0.97
    hole = rim_in <= 1
    # inner back wall: lit, darkening toward the front lip (deep inside)
    depth = (yy - (yt - er)) / (2 * er)
    inner = ceramic * (0.92 - 0.30 * np.clip(depth, 0, 1))[..., None]
    inner *= (0.92 + 0.08 * np.clip(-(xx - cx) / R, -1, 1))[..., None]
    canvas = np.where(hole[..., None], inner, canvas)
    # glossy highlight along the front lip
    lipline = np.abs(np.sqrt(rim_out) - 1) < 0.012
    front = yy > yt
    canvas[lipline & front & (xx < cx)] = np.minimum(canvas[lipline & front & (xx < cx)] + 20, 255)

    img = to_img(canvas).resize((W, H), Image.LANCZOS)
    img.save(OUT / '2-mug.jpg', quality=92)


# =====================================================================
# T-SHIRT
# =====================================================================

def bezier(p0, p1, p2, p3, n=40):
    t = np.linspace(0, 1, n)[:, None]
    return ((1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3 * p3)


def ridge(xx, yy, a, b, width, amp):
    """Soft fold along segment a-b: one side lit, the other shaded."""
    a, b = np.array(a, float), np.array(b, float)
    ab = b - a
    L = np.linalg.norm(ab)
    t = np.clip(((xx - a[0]) * ab[0] + (yy - a[1]) * ab[1]) / (L * L), 0, 1)
    px, py = a[0] + t * ab[0], a[1] + t * ab[1]
    nx, ny = -ab[1] / L, ab[0] / L
    sd = (xx - px) * nx + (yy - py) * ny               # signed distance
    taper = np.sin(np.pi * t) ** 0.8                    # fade at the ends
    return amp * taper * (sd / width) * np.exp(-(sd / width) ** 2)


def tshirt():
    S = 2
    Wc, Hc = W * S, H * S
    cx = W / 2
    # right half outline (x offset from centre, y) as cubic Béziers
    segs = [
        [(92, 128), (140, 140), (205, 150), (255, 168)],       # shoulder seam
        [(255, 168), (330, 196), (405, 262), (452, 338)],      # sleeve top
        [(452, 338), (440, 368), (420, 398), (400, 428)],      # sleeve opening
        [(400, 428), (360, 418), (318, 406), (285, 398)],      # sleeve underside
        [(285, 398), (276, 560), (270, 760), (282, 1052)],     # side seam, slight waist
        [(282, 1052), (190, 1062), (90, 1066), (0, 1067)],     # hem
    ]
    right = np.vstack([bezier(*[np.array(p, float) for p in sg]) for sg in segs])
    left = right[::-1] * np.array([-1, 1])
    outline = np.vstack([right, left]) + np.array([cx, 0])
    neck_t = np.linspace(math.pi, 0, 60)
    neck = np.stack([cx + 92 * np.cos(neck_t), 128 + 74 * np.sin(neck_t)], -1)
    back_neck = np.stack([cx + 92 * np.cos(neck_t), 128 + 16 * np.sin(neck_t)], -1)

    def poly_mask(pts, val=255, base=None):
        m = base if base is not None else Image.new('L', (Wc, Hc), 0)
        ImageDraw.Draw(m).polygon([(x * S, y * S) for x, y in pts], fill=val)
        return m

    m = poly_mask(outline)
    m = poly_mask(neck, 0, m)
    inside_back = poly_mask(np.vstack([neck, back_neck[::-1]]))  # visible inside of the back
    mask = np.asarray(m.resize((W, H), Image.LANCZOS), float) / 255
    back = np.asarray(inside_back.resize((W, H), Image.LANCZOS), float) / 255

    canvas = background()
    canvas = soft_shadow(canvas, mask, (6, 16), 22, 0.32)

    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    rng = np.random.default_rng(3)

    # --- form shading: torso is a soft cylinder, light from the left
    u = np.clip((xx - cx) / 290, -1.4, 1.4)
    torso = 0.92 + 0.07 * np.cos(np.clip(u, -1.2, 1.2) * 1.2) - 0.05 * u
    # ambient occlusion along the silhouette
    ao = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(18)), float) / 255
    shade = torso * (0.80 + 0.20 * ao)
    # sleeves turn away from the light; armpits darker
    def smooth(e0, e1, v):
        t = np.clip((v - e0) / (e1 - e0), 0, 1)
        return t * t * (3 - 2 * t)
    sleeve = smooth(255, 330, np.abs(xx - cx)) * (1 - smooth(380, 470, yy))
    shade *= 1 - sleeve * (0.07 + 0.04 * np.sign(xx - cx))
    for sgn in (-1, 1):
        shade *= 1 - 0.10 * np.exp(-(((xx - (cx + sgn * 285)) / 28) ** 2 + ((yy - 405) / 40) ** 2))

    # --- folds
    fold = np.zeros((H, W))
    folds = [
        ((cx - 280, 420), (cx - 150, 560), 22, 0.10),     # armpit drag lines
        ((cx + 280, 420), (cx + 150, 560), 22, -0.10),
        ((cx - 270, 470), (cx - 175, 700), 26, 0.07),
        ((cx + 270, 470), (cx + 180, 690), 26, -0.07),
        ((cx - 120, 820), (cx - 60, 1040), 30, 0.06),     # lower drape
        ((cx + 90, 800), (cx + 150, 1040), 30, -0.06),
        ((cx - 250, 940), (cx - 140, 1045), 20, 0.05),
        ((cx + 255, 930), (cx + 170, 1045), 20, -0.05),
        ((cx + 330, 230), (cx + 420, 330), 16, -0.06),    # sleeve creases
        ((cx - 330, 230), (cx - 420, 330), 16, 0.06),
    ]
    for a, b, w, amp in folds:
        fold += ridge(xx, yy, a, b, w, amp)
    # gentle horizontal ripples near the hem
    fold += 0.012 * np.sin(yy / 9.0) * np.exp(-((yy - 1030) / 30) ** 2)
    shade *= 1 + fold

    # --- jersey knit texture
    knit = 1 + 0.018 * (rng.random((H, W)) - 0.5) + 0.008 * np.sin(xx * 2.2) * np.sin(yy * 1.4)

    cotton = np.array([242, 239, 233], float)
    shirt = cotton * (shade * knit)[..., None]

    # --- print: ink sits in the fabric, so folds + knit show through
    pw = 280
    ph = int(pw * AH / AW)
    px0, py0 = int(cx - pw / 2), 268
    pr = np.asarray(art.resize((pw, ph), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.5)), float)
    grey = pr.mean(-1, keepdims=True)
    pr = grey + 0.90 * (pr - grey)                         # cotton mutes saturation a touch
    # warp slightly along the fold field so lines bend with the fabric
    fy = np.gradient(fold, axis=0)[py0:py0 + ph, px0:px0 + pw]
    fx = np.gradient(fold, axis=1)[py0:py0 + ph, px0:px0 + pw]
    gy, gx = np.mgrid[0:ph, 0:pw]
    sy = np.clip(gy + fy * 900, 0, ph - 1).astype(int)
    sx = np.clip(gx + fx * 900, 0, pw - 1).astype(int)
    pr = pr[sy, sx]
    region = shirt[py0:py0 + ph, px0:px0 + pw]
    ink = (pr / 255) * (shade * knit)[py0:py0 + ph, px0:px0 + pw, None] * 255
    shirt[py0:py0 + ph, px0:px0 + pw] = 0.06 * region + 0.94 * ink

    # --- neck: inside of the back, rib collar, shoulder seams
    shirt = np.where(back[..., None] > 0.5, cotton * 0.80, shirt)
    canvas = canvas * (1 - mask[..., None]) + shirt * mask[..., None]
    canvas = canvas * (1 - back[..., None]) + (cotton * 0.80) * back[..., None]

    img = to_img(canvas)
    d = ImageDraw.Draw(img)
    rib = [(cx + 92 * math.cos(t), 128 + 74 * math.sin(t)) for t in np.linspace(math.pi, 0, 60)]
    d.line(rib, fill=(222, 218, 211), width=16, joint='curve')
    d.line([(x, y + 8) for x, y in rib], fill=(206, 201, 193), width=2)
    for i in range(0, 60, 2):                                   # rib texture
        x, y = rib[i]
        d.line([(x, y - 6), (x, y + 6)], fill=(214, 210, 203), width=1)
    for sgn in (1, -1):
        d.line([(cx + sgn * 92, 130), (cx + sgn * 255, 168)], fill=(224, 220, 213), width=2)
        d.line([(cx + sgn * 452, 338), (cx + sgn * 400, 428)], fill=(220, 216, 209), width=3)
        d.line([(cx + sgn * 440, 352), (cx + sgn * 392, 432)], fill=(228, 225, 219), width=1)
    d.line([(cx - 282, 1040), (cx + 282, 1040)], fill=(222, 218, 211), width=2)
    img.save(OUT / '3-tshirt.jpg', quality=92)


if __name__ == '__main__':
    setup(Image.open(sys.argv[1]).convert('RGB'), sys.argv[2])
    mug()
    tshirt()
