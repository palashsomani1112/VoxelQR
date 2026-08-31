import json
import sys
from PIL import Image, ImageDraw

src = sys.argv[1] if len(sys.argv) > 1 else "/home/claude/preview.json"
out = sys.argv[2] if len(sys.argv) > 2 else "/home/claude/preview.png"
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 3
scale = float(sys.argv[4]) if len(sys.argv) > 4 else 1.6

frames = json.load(open(src))
BG = (250, 249, 245)
LABEL = (70, 74, 68)


def cell(frame, pad=14):
    xs = [p[0] for poly in frame["polys"] for p in poly[0]]
    ys = [p[1] for poly in frame["polys"] for p in poly[0]]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    w = int((x1 - x0) * scale) + pad * 2
    h = int((y1 - y0) * scale) + pad * 2 + 18
    img = Image.new("RGB", (w, h), BG)
    dr = ImageDraw.Draw(img)
    for poly, color in frame["polys"]:
        pts = [((px - x0) * scale + pad, (py - y0) * scale + pad) for px, py in poly]
        if len(pts) < 3:
            dr.line(pts, fill=color, width=2)
        else:
            dr.polygon(pts, fill=color)
    dr.text((pad, h - 15), frame["label"], fill=LABEL)
    return img


cells = [cell(f) for f in frames]
cw = max(c.width for c in cells)
ch = max(c.height for c in cells)
rows = (len(cells) + cols - 1) // cols
sheet = Image.new("RGB", (cw * cols, ch * rows), BG)
for i, c in enumerate(cells):
    sheet.paste(c, ((i % cols) * cw, (i // cols) * ch))
sheet.save(out)
print(out, sheet.size)
