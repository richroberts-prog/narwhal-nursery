# Contact sheet of pictures, for checking by eye: montage.py out.png cols crop(x0,y0,x1,y1|-) files...
import sys
from PIL import Image
out, cols, crop, files = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4:]
ims = [Image.open(f).convert('RGB') for f in files]
if crop != '-': ims = [i.crop(tuple(int(v) for v in crop.split(','))) for i in ims]
w, h = ims[0].size
s = min(1, 2400 / (w * cols))
ims = [i.resize((int(w * s), int(h * s))) for i in ims]
w, h = ims[0].size
sheet = Image.new('RGB', (w * cols, h * ((len(ims) + cols - 1) // cols)), 'white')
for k, i in enumerate(ims): sheet.paste(i, ((k % cols) * w, (k // cols) * h))
sheet.save(out)
