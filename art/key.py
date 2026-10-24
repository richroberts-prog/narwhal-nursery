# Remove only the bright key green (#00FF00-ish), keeping green clothes: distance from pure key green, soft edge.
import numpy as np
from PIL import Image
from scipy.ndimage import minimum_filter
def key(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(float)
    d = np.sqrt(a[..., 0] ** 2 + (255 - a[..., 1]) ** 2 + a[..., 2] ** 2)
    alpha = np.clip((d - 50) * 255 / 40, 0, 255)  # <50 away: background; >90: solid (mid greens in clothes stay solid)
    alpha = minimum_filter(alpha, size=3)  # trim one pixel off every edge, where the key green bleeds in
    rgb = a.copy()
    edge = (alpha < 255) & (a[..., 1] > np.maximum(a[..., 0], a[..., 2]))
    rgb[..., 1][edge] = np.maximum(a[..., 0], a[..., 2])[edge]  # despill the soft edge only
    return np.dstack([rgb, alpha]).astype(np.uint8)
