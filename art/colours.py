"""Pick the main colours of each painted clothes picture, for the 3D people (public/art/colours.json).

Run with Blender's Python (it reads webp): ~/opt/blender/blender -b -P art/colours.py
Each item gets [main, second]: the two biggest colour groups among its opaque pixels (k-means, k=3, white-ish
outline pixels count too, so the second colour is the pattern or trim).
"""
import json, os, random
import bpy

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'art')
manifest = json.load(open(os.path.join(ROOT, 'manifest.json')))


def pixels(path):
    img = bpy.data.images.load(path)
    w, h = img.size
    px = list(img.pixels)
    bpy.data.images.remove(img)
    out = []
    step = max(1, (w * h) // 6000)
    for i in range(0, w * h, step):
        r, g, b, a = px[i * 4:i * 4 + 4]
        if a > 0.9:
            out.append((r, g, b))
    return out


def kmeans(pts, k=3, rounds=12):
    random.seed(1)
    cs = random.sample(pts, min(k, len(pts)))
    for _ in range(rounds):
        groups = [[] for _ in cs]
        for p in pts:
            j = min(range(len(cs)), key=lambda j: sum((p[i] - cs[j][i]) ** 2 for i in range(3)))
            groups[j].append(p)
        cs = [tuple(sum(c[i] for c in g) / len(g) for i in range(3)) if g else cs[j] for j, g in enumerate(groups)]
    sizes = [len(g) for g in groups]
    return [c for _, c in sorted(zip(sizes, cs), reverse=True)]


def hexc(c):
    # Blender gives linear values; turn them back into sRGB hex
    def s(x):
        x = max(0.0, min(1.0, x))
        return 12.92 * x if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055
    return '#%02x%02x%02x' % tuple(round(s(v) * 255) for v in c)


def dark(c):
    return sum(c) / 3 < 0.02


out = {}
for kind in ('baby', 'kid', 'adult'):
    for it in manifest[kind]['items']:
        path = os.path.join(ROOT, kind, it['id'] + '.webp')
        pts = pixels(path)
        if not pts:
            continue
        cs = [c for c in kmeans(pts) if not dark(c)] or kmeans(pts)
        out[f"{kind}:{it['id']}"] = [hexc(c) for c in cs[:2]]
json.dump(out, open(os.path.join(ROOT, 'colours.json'), 'w'), indent=0, sort_keys=True)
print('WROTE', len(out))
