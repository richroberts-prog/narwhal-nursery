# Rooms and stickers: the painted floors, the front pieces cut from them (cots, desk, chest) that stand in front of
# people, and the sheets of grown-ups, helpers, reward toys and bedding cut into one picture each.
#
#   uv run --with pillow --with numpy --with scipy python art/rooms.py
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

sys.path.insert(0, os.path.dirname(__file__))
from key import key  # noqa: E402

HERE = os.path.dirname(__file__)
SRC = os.path.join(HERE, 'src')
OUT = os.path.join(HERE, '..', 'public', 'art')


def poly(size, points):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).polygon(points, fill=255)
    return np.asarray(m) > 0


# Each front piece: polygons (image pixels), whether only its pale wood counts (cot bars, so the mattress behind shows
# through the gaps), a see-through box (bars a sleeping child shows through), and its depth (the y of its front edge).
FRONT = {
    'up': {
        'cotA': ([[(52, 466), (318, 466), (318, 628), (52, 628)], [(40, 430), (134, 430), (134, 662), (40, 662)], [(308, 436), (378, 436), (378, 660), (308, 660)]], True, (134, 486, 310, 603), 630),
        'cotB': ([[(235, 432), (395, 432), (395, 548), (235, 548)], [(388, 405), (442, 405), (442, 562), (388, 562)]], True, (235, 442, 390, 540), 562),
        'cotC': ([[(315, 387), (455, 387), (455, 500), (315, 500)], [(452, 380), (492, 380), (492, 535), (452, 535)], [(262, 375), (315, 375), (315, 500), (262, 500)]], True, (315, 397, 452, 495), 536),
        'cotD': ([[(548, 398), (735, 398), (735, 512), (548, 512)], [(538, 370), (556, 370), (556, 532), (538, 532)], [(720, 370), (748, 370), (748, 532), (720, 532)]], True, (556, 410, 720, 500), 534),
    },
    'down': {
        'desk': ([[(188, 422), (396, 422), (396, 572), (188, 572)], [(212, 400), (250, 400), (250, 424), (212, 424)]], False, None, 572),
        'chest': ([[(946, 640), (960, 612), (1000, 600), (1080, 600), (1125, 612), (1140, 640), (1140, 752), (946, 752)], [(1010, 583), (1075, 583), (1072, 622), (1012, 622)]], False, None, 755),
    },
}


def rooms(manifest):
    for floor in ('down', 'up'):
        img = Image.open(os.path.join(SRC, f'room-{floor}.png')).convert('RGBA')
        img.convert('RGB').save(os.path.join(OUT, f'room-{floor}.webp'), 'WEBP', quality=86, method=6)
        a = np.asarray(img).astype(int)
        r, g, b = a[..., 0], a[..., 1], a[..., 2]
        wood = (r > 195) & (g > 185) & (b > 175) & (b - r < 12)  # warm white cot wood, not the blue mattress or lilac wall
        ink = (r + g + b < 330) & (np.abs(r - b) < 60)
        fronts = []
        for name, (polys, pale_only, see, depth) in FRONT[floor].items():
            m = np.zeros(a.shape[:2], bool)
            for p in polys:
                m |= poly(img.size, p)
            if pale_only:
                m &= wood | ink
            out = np.zeros_like(a)
            out[m] = a[m]
            if see:
                x0, y0, x1, y1 = see
                bars = np.zeros_like(m)
                bars[y0:y1, x0:x1] = True
                out[..., 3][bars & m] = 120
            ys, xs = np.where(m)
            box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
            Image.fromarray(out[box[1]:box[3], box[0]:box[2]].astype(np.uint8)).save(os.path.join(OUT, f'front-{floor}-{name}.webp'), 'WEBP', quality=88, method=6)
            fronts.append({'id': name, 'x': box[0], 'y': box[1], 'w': box[2] - box[0], 'h': box[3] - box[1], 'z': depth})
        manifest[f'room-{floor}'] = {'size': list(img.size), 'fronts': fronts}


def blobs(file, min_area=4000):
    """Cut a sheet into one picture per figure (left to right), each cropped tight."""
    img = key(os.path.join(SRC, file))
    solid = img[..., 3] > 128
    labels, _ = ndimage.label(ndimage.binary_closing(solid, iterations=3))
    sizes = np.bincount(labels.ravel())
    out = []
    for sl in sorted(ndimage.find_objects(labels), key=lambda sl: sl[1].start):
        ys, xs = sl
        if (ys.stop - ys.start) * (xs.stop - xs.start) < min_area:
            continue
        lab = labels[sl]
        keep = (lab == np.bincount(lab[lab > 0]).argmax()) | ((lab > 0) & (sizes[lab] < min_area))
        part = img[sl].copy()
        part[..., 3] = np.where(keep, part[..., 3], 0)
        out.append(part)
    return out


def sheet(file, folder, names, manifest):
    parts = blobs(file)
    assert len(parts) == len(names), f'{file}: {len(parts)} figures, expected {len(names)}'
    os.makedirs(os.path.join(OUT, folder), exist_ok=True)
    for part, name in zip(parts, names):
        Image.fromarray(part.astype(np.uint8)).save(os.path.join(OUT, folder, f'{name}.webp'), 'WEBP', quality=88, method=6)
        manifest.setdefault(folder, {})[name] = [part.shape[1], part.shape[0]]


def main():
    manifest = {}
    rooms(manifest)
    # Grown-ups: the sheets' order, so a family can pick a parent who looks like their children.
    sheet('parents-1.png', 'parents', ['mum-1', 'dad-1', 'mum-2', 'dad-2', 'gran-1', 'dad-3'], manifest)
    sheet('parents-2.png', 'parents', ['mum-3', 'dad-4', 'mum-4', 'grandad-1', 'mum-5', 'dad-5'], manifest)
    sheet('helpers.png', 'helpers', ['nappy', 'snack', 'nap', 'play', 'art', 'story'], manifest)
    sheet('rewards.png', 'rewards', ['slide', 'ballpit', 'trampoline', 'fishtank', 'teepee', 'horse'], manifest)
    sheet('bedding.png', 'bedding', ['pillow', 'blanket'], manifest)
    sheet('style-people.png', 'staff', ['emily', 'isabelle-old', 'dad-old', 'max', 'rosie', 'theo'], manifest)
    with open(os.path.join(OUT, 'rooms.json'), 'w') as f:
        json.dump(manifest, f, indent=1)
    print(json.dumps({k: (len(v) if isinstance(v, dict) else v) for k, v in manifest.items()})[:600])


if __name__ == '__main__':
    main()
