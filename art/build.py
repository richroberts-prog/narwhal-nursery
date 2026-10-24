# Turn painted source pictures (art/src) into the game's picture layers (public/art).
#
# A doll is painted once on a key-green background, then every variant (a face, a hairstyle, an outfit) is an *edit*
# of that same picture, so all of them line up to the pixel. A variant's layer is the pixels that changed, sorted
# into slots by where they are on the body. Every layer is saved at the same canvas size, so the game just stacks them.
#
#   uv run --with pillow --with numpy --with scipy python art/build.py
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, os.path.dirname(__file__))
from key import key  # noqa: E402

HERE = os.path.dirname(__file__)
SRC = os.path.join(HERE, 'src')
OUT = os.path.join(HERE, '..', 'public', 'art')

SKINS = ['#ffe3cc', '#f6cfa9', '#e6b48a', '#c98d63', '#9a6540', '#6b4329']
HAIR_COLOURS = {'black': '#2a1d17', 'darkbrown': '#4a2f20', 'brown': '#7b4c2c', 'auburn': '#9c4a2a', 'ginger': '#d07a3c', 'blonde': '#e3bf6e', 'platinum': '#efe0b4'}


def rgb(hexs):
    return np.array([int(hexs[i:i + 2], 16) for i in (1, 3, 5)], dtype=float)


def save(arr, *path):
    p = os.path.join(OUT, *path)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    Image.fromarray(arr.astype(np.uint8)).save(p, 'WEBP', quality=88, method=6)


def hsv(a):
    x = a[..., :3] / 255
    mx, mn = x.max(-1), x.min(-1)
    d = mx - mn + 1e-6
    h = np.where(mx == x[..., 0], ((x[..., 1] - x[..., 2]) / d) % 6, np.where(mx == x[..., 1], (x[..., 2] - x[..., 0]) / d + 2, (x[..., 0] - x[..., 1]) / d + 4)) * 60
    return h, np.where(mx > 0, d / (mx + 1e-6), 0), mx


def changed(a, base, thresh=38):
    """Pixels that differ from the base doll: new where the base was empty, a clear colour change, or a change of hue
    (pink leggings over peach skin barely change brightness, but their hue moves a long way)."""
    newly = (a[..., 3] > 128) & (base[..., 3] < 128)
    diff = np.abs(a[..., :3].astype(int) - base[..., :3].astype(int)).sum(-1) > thresh * 3
    h1, s1, _ = hsv(a)
    h0, s0, _ = hsv(base)
    dh = np.abs(h1 - h0)
    hue = (np.minimum(dh, 360 - dh) > 16) & (np.maximum(s1, s0) > 0.15)
    return newly | ((diff | hue) & (a[..., 3] > 128))


def tidy(mask, min_size=120, grow=1):
    lab, n = ndimage.label(mask)
    sizes = np.bincount(lab.ravel())
    keep = sizes[lab] >= min_size
    keep[lab == 0] = False
    return ndimage.binary_dilation(keep, iterations=grow) if grow else keep


def solid(mask, a):
    """A garment is one piece: close small gaps and fill holes where its colour happened to match the plain doll."""
    return ndimage.binary_fill_holes(ndimage.binary_closing(mask, iterations=3)) & (a[..., 3] > 0)


def layer(a, mask):
    out = a.copy()
    out[..., 3] = np.where(mask, a[..., 3], 0)
    return out


def recolour(a, mask, target, ref=None):
    """Shift masked pixels to a target colour, keeping their light and shade."""
    out = a.copy().astype(float)
    ref = ref if ref is not None else np.median(a[mask][:, :3], axis=0)
    out[..., :3][mask] = np.clip(a[..., :3][mask] * (target / ref), 0, 255)
    return out


def clothes_mask(a):
    """The doll's white vest and shorts, shading included: white areas closed up and filled."""
    h, s, v = hsv(a)
    white = (s < 0.12) & (v > 0.82) & (a[..., 3] > 0)
    return ndimage.binary_fill_holes(ndimage.binary_closing(white, iterations=6))


def skin_mask(a, clothes=None):
    h, s, v = hsv(a)
    m = (a[..., 3] > 0) & ((h < 45) | (h > 340)) & (s > 0.1) & (s < 0.62) & (v > 0.55)
    return m & ~clothes if clothes is not None else m


class Doll:
    """One painted doll and its edits. `box` crops every picture to the shared canvas; the head is measured from the
    plain doll (canvas coordinates) so faces, hair and hats are cut in the right places."""

    def __init__(self, name, box):
        self.name, self.box = name, box
        self.base = self.load(f'{name}-base.png')
        m = self.base[..., 3] > 128
        ys = np.where(m.any(1))[0]
        top, height = ys[0], ys[-1] - ys[0]
        lo, hi = top + int(0.15 * height), top + int(0.5 * height)
        self.neck = lo + int(np.argmin(m.sum(1)[lo:hi]))  # the narrowest row under the head
        xs = np.where(m[top:self.neck].any(0))[0]
        w, h = xs[-1] - xs[0], self.neck - top
        self.brow = top + int(0.52 * h)
        self.eyes_end = top + int(0.78 * h)
        self.face_box = (xs[0] + int(0.17 * w), self.brow, xs[0] + int(0.81 * w), top + int(0.95 * h))
        self.rows = np.arange(self.base.shape[0])[:, None]

    def load(self, file):
        x0, y0, x1, y1 = self.box
        return key(os.path.join(SRC, file))[y0:y1, x0:x1]

    def body(self):
        skin = skin_mask(self.base, clothes_mask(self.base))
        ref = np.median(self.base[skin][:, :3], axis=0)
        for i, tone in enumerate(SKINS):
            save(recolour(self.base, skin, rgb(tone), ref), self.name, f'body-{i}.webp')
        return ref

    def faces(self, moods, ref):
        rows = self.rows
        for mood in moods:
            a = self.load(f'{self.name}-face-{mood}.png')
            head = (rows < self.neck) & (a[..., 3] > 0)
            for i, tone in enumerate(SKINS):
                lay = layer(a, head)
                save(recolour(lay, skin_mask(lay), rgb(tone), ref), self.name, f'face-{mood}-{i}.webp')

    def part(self, a, m, name, solid_fill=True):
        m = tidy(m, 200)
        if solid_fill:
            m = solid(m, a)
        out = layer(a, m)
        save(out, self.name, f'{name}.webp')
        return out

    def hair(self, styles):
        x0, y0, x1, y1 = self.face_box
        for style in styles:
            a = self.load(f'{self.name}-hair-{style}.png')
            h, s, v = hsv(a)
            hairlike = (s > 0.22) & (v < 0.8) & ((h < 50) | (h > 330))
            mask = changed(a, self.base) & (hairlike | (self.base[..., 3] < 128))
            cy, cx = (y0 + y1) / 2, (x0 + x1) / 2
            ry, rx = (y1 - y0) / 2, (x1 - x0) * 0.36
            yy, xx = np.mgrid[:mask.shape[0], :mask.shape[1]]
            mask[((yy - cy) / ry) ** 2 + ((xx - cx) / rx) ** 2 < 1] = False  # never take eyes, nose, mouth: an oval, not a box
            mask = tidy(mask)
            lay = layer(a, mask)
            # Recolour by brightness, so every pixel takes the new hair's hue (scaling channels tints dark outlines green).
            lum = lay[..., :3].astype(float) @ [0.3, 0.59, 0.11]
            l0 = float(np.median(lum[mask]))
            for c, hexs in HAIR_COLOURS.items():
                out = lay.copy().astype(float)
                out[..., :3][mask] = np.clip(np.outer(lum[mask] / l0, rgb(hexs)), 0, 255)
                save(out, self.name, f'hair-{style}-{c}.webp')


# Each painted outfit: where its top ends (waist) and its shoes start, measured from the painting (full-picture rows),
# then what each part is called. A head item is a hat or a headband; glasses are worn with some of the headbands.
OUTFITS = {
    1: (436, 662, ('hat', 'Red cap'), None, 'Yellow t-shirt', 'Green shorts', 'Red trainers'),
    2: (436, 590, ('hat', 'Gold crown'), None, 'Star t-shirt', 'Pink tutu', 'Green wellies'),
    3: (436, 672, ('headband', 'Pink bow'), 'Red glasses', 'Heart t-shirt', 'Purple skirt', 'Pink shoes'),
    4: (472, 648, ('hat', 'Bobble hat'), None, 'Stripy jumper', 'Jeans', 'Brown boots'),
    5: (436, 672, ('hat', 'Sun hat'), None, 'Dino dungarees top', 'Denim shorts', 'Sandals'),
    6: (466, 672, ('headband', 'Flower crown'), 'Star sunglasses', 'Rainbow t-shirt', 'Rainbow leggings', 'Sparkly shoes'),
    7: (464, 674, ('hat', 'Party hat'), None, 'Spotty t-shirt', 'Joggers', 'Blue trainers'),
    8: (485, 660, ('headband', 'Cat ears'), 'Blue glasses', 'Lilac hoodie', 'Pink leggings', 'White trainers'),
    9: (516, 640, ('hat', 'Pirate hat'), None, 'Sailor top', 'Black trousers', 'Black boots'),
    10: (460, 662, ('headband', 'Unicorn horn'), None, 'Fluffy cardigan', 'Yellow skirt', 'Gold shoes'),
    11: (446, 590, ('hat', 'Backwards cap'), None, 'Football shirt', 'Football shorts', 'Football boots'),
    # The edit gave the doll hair under the helmet: cut it at the eyebrows so the hair isn't part of the hat.
    12: (506, 640, ('hat', 'Fire helmet', 'brow'), None, 'Fire jacket', 'Fire trousers', 'Black wellies'),
    13: (482, 662, ('hat', 'Grey beanie'), None, 'Rocket hoodie', 'Cargo shorts', 'Grey trainers'),
    14: (436, 674, ('hat', 'Flat cap'), None, 'Shirt and bow tie', 'Smart trousers', 'Brown shoes'),
    15: (466, 652, None, 'Cool sunglasses', 'Lightning t-shirt', 'Denim shorts', 'Light-up trainers'),
    16: (482, 650, ('hat', 'Hard hat'), None, 'Hi-vis vest', 'Work jeans', 'Work boots'),
    17: (420, 664, ('headband', 'Princess tiara'), None, 'Sparkly princess top', 'Princess skirt', 'Glitter shoes'),
    18: (436, 664, ('headband', 'Butterfly clip'), None, 'Sunflower t-shirt', 'Denim skirt', 'Flower sandals'),
    19: (426, 674, ('hat', 'Pink beret'), None, 'Frilly blouse', 'Tartan skirt', 'Red bow shoes'),
    # The heart sunglasses sit up on the head, so they count as a headband.
    20: (484, 664, ('headband', 'Heart sunglasses'), None, 'Unicorn hoodie', 'Sparkly leggings', 'Pink sparkly trainers'),
    21: (446, 676, ('headband', 'Ballet headband'), None, 'Ballet leotard', 'Ballet tutu', 'Ballet shoes'),
    22: (470, 664, ('hat', 'Floppy sun hat'), None, 'Strawberry dress', 'Strawberry skirt', 'Jelly sandals'),
}
EXTRAS = {'wings': ('Fairy wings', 'back'), 'cape': ('Super cape', 'back'), 'necklace': ('Bead necklace', 'front'), 'backpack': ('Backpack', 'front')}
DOLL_WAIST = 437  # where the plain kid doll's shorts start


def raise_waist(out, waist, base):
    """Bottoms painted under a long top start low; carry their top edge up to the doll's waist so no shorts peek out."""
    out = out.copy()
    band = out[waist + 3:waist + 30]
    colour = np.median(band[band[..., 3] > 200][:, :3], axis=0)
    xs = np.where(out[waist + 15, :, 3] > 0)[0]
    span = np.zeros(out.shape[1], bool)
    span[xs.min():xs.max() + 1] = True  # the trousers' full width just below their top
    for y in range(DOLL_WAIST - 2, waist + 4):
        row = (base[y, :, 3] > 0) & span
        out[y, row, :3] = colour * (0.92 if y < DOLL_WAIST + 3 else 1)  # a plain waistband in the trousers' own colour
        out[y, row, 3] = 255
    return out


def outfits(doll):
    """Split each painted outfit into its parts by height on the body. Returns the item list for the game."""
    items = []
    y0 = doll.box[1]
    rows = doll.rows + y0
    for n, (waist, shoe, head, glasses, top, bottoms, shoes) in OUTFITS.items():
        a = doll.load(f'kid-outfit-{n}.png')
        ch = changed(a, doll.base)
        parts = [] if head is None else [
            (head[0], head[1], ch & (doll.rows < (doll.brow if glasses or len(head) > 2 else doll.eyes_end))),
        ]
        parts += [
            ('top', top, ch & (doll.rows >= doll.neck - 14) & (rows < waist)),
            ('bottoms', bottoms, ch & (rows >= waist) & (rows < shoe)),
            ('shoes', shoes, ch & (rows >= shoe)),
        ]
        if glasses:
            parts.append(('glasses', glasses, changed(a, doll.base, 60) & (doll.rows >= doll.brow - 6) & (doll.rows < doll.eyes_end)))
        for cat, name, m in parts:
            m = tidy(m, 200)
            if cat in ('top', 'bottoms', 'shoes', 'hat'):
                m = solid(m, a)
            out = layer(a, m)
            if cat == 'bottoms' and waist > DOLL_WAIST:
                out = raise_waist(out, waist - y0, doll.base)
            save(out, 'kid', f'{cat}-{n}.webp')
            items.append({'id': f'{cat}-{n}', 'cat': cat, 'name': name})
    for k, (name, z) in EXTRAS.items():
        a = doll.load(f'kid-extra-{k}.png')
        save(layer(a, tidy(changed(a, doll.base), 200)), 'kid', f'extra-{k}.webp')
        items.append({'id': f'extra-{k}', 'cat': 'extra', 'name': name, 'z': z})
    return items


BABY_OUTFITS = {1: ('Bonnet', 'Duck bodysuit'), 2: ('Bobble hat', 'Stripy bodysuit'), 3: ('Pink bow', 'Spotty bodysuit'), 4: ('Daisy headband', 'Dino bodysuit'),
                5: ('Blue cap', 'Car bodysuit'), 6: ('Bear hat', 'Bear bodysuit'), 7: ('Flower headband', 'Tutu bodysuit'), 8: ('Bunny ears', 'Bunny bodysuit')}
DUMMY_COLOURS = {'pink': '#ff8fb8', 'blue': '#6fb6ff', 'yellow': '#ffd84d', 'green': '#6fd39b', 'purple': '#b48cf0'}
ADULT_OUTFITS = {1: ('Pink bow', 'Pink dress'), 2: ('Sun hat', 'Sundress'), 3: ('Spotty headband', 'Dungarees'), 4: (None, 'Jumper dress'), 5: ('Tiara', 'Party dress')}


def styles_of(prefix):
    return sorted(f[len(prefix):-4] for f in os.listdir(SRC) if f.startswith(prefix) and f.endswith('.png'))


def head_and_body(doll, outfits_table, body_cat):
    """Outfits that are one head item plus one body piece (a bodysuit, a dress)."""
    items = []
    for n, (head, body) in outfits_table.items():
        a = doll.load(f'{doll.name}-outfit-{n}.png')
        ch = changed(a, doll.base)
        if head:
            doll.part(a, ch & (doll.rows < doll.eyes_end), f'head-{n}', solid_fill=False)
            items.append({'id': f'head-{n}', 'cat': 'head', 'name': head})
        doll.part(a, ch & (doll.rows >= doll.neck - 14), f'{body_cat}-{n}')
        items.append({'id': f'{body_cat}-{n}', 'cat': body_cat, 'name': body})
    return items


def dummies(doll):
    a = doll.load('baby-dummy.png')
    x0, y0, x1, y1 = doll.face_box
    m = changed(a, doll.base, 45)
    m[:y0] = False
    m[y1 + 20:] = False
    m = tidy(m, 60, 1)
    lay = layer(a, m)
    lum = lay[..., :3].astype(float) @ [0.3, 0.59, 0.11]
    l0 = float(np.percentile(lum[m], 60))
    items = []
    for c, hexs in DUMMY_COLOURS.items():
        out = lay.copy().astype(float)
        out[..., :3][m] = np.clip(np.outer(lum[m] / l0, rgb(hexs)), 0, 255)
        save(out, 'baby', f'dummy-{c}.webp')
        items.append({'id': f'dummy-{c}', 'cat': 'dummy', 'name': f'{c.capitalize()} dummy'})
    return items


def main():
    manifest = {}
    moods = ['laugh', 'want', 'cry', 'asleep']
    kid = Doll('kid', box=(440, 0, 930, 740))
    kid.faces(moods, kid.body())
    kid.hair(styles_of('kid-hair-'))
    manifest['kid'] = {'size': [kid.box[2] - kid.box[0], kid.box[3] - kid.box[1]], 'hair': styles_of('kid-hair-'), 'items': outfits(kid)}

    baby = Doll('baby', box=(380, 0, 1000, 768))
    baby.faces(moods, baby.body())
    baby.hair(styles_of('baby-hair-'))
    manifest['baby'] = {'size': [baby.box[2] - baby.box[0], baby.box[3] - baby.box[1]], 'hair': styles_of('baby-hair-'),
                        'items': head_and_body(baby, BABY_OUTFITS, 'suit') + dummies(baby)}

    adult = Doll('adult', box=(440, 0, 940, 768))
    adult.body()
    adult.hair(styles_of('adult-hair-'))
    manifest['adult'] = {'size': [adult.box[2] - adult.box[0], adult.box[3] - adult.box[1]], 'hair': styles_of('adult-hair-'),
                         'items': head_and_body(adult, ADULT_OUTFITS, 'outfit')}
    with open(os.path.join(OUT, 'manifest.json'), 'w') as f:
        json.dump(manifest, f, indent=1)
    print(json.dumps(manifest))


if __name__ == '__main__':
    main()
