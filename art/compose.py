# Stack layers into one picture for checking by eye: compose.py out.png layer.webp ...  (first = bottom)
import sys
from PIL import Image
ims = [Image.open(f).convert('RGBA') for f in sys.argv[2:]]
c = Image.new('RGBA', ims[0].size, (255, 244, 236, 255))
for i in ims: c.alpha_composite(i)
c.save(sys.argv[1])
