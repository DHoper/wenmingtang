"""把一個尺寸的截圖拼成總覽：python tests/sheet.py <資料夾> <輸出.png> <起> <迄> [縮放寬]"""
import sys, glob, os
from PIL import Image, ImageDraw, ImageFont
d, outp, a, b = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
tw = int(sys.argv[5]) if len(sys.argv) > 5 else 300
fs = sorted(glob.glob(os.path.join(d, "*.png")))[a - 1:b]
ims = [Image.open(f) for f in fs]
r = tw / ims[0].width; th = int(ims[0].height * r)
cols = min(5, len(ims)); rows = (len(ims) + cols - 1) // cols
font = ImageFont.truetype("C:/Windows/Fonts/msjh.ttc", 16)
s = Image.new("RGB", (cols * (tw + 8), rows * (th + 26)), "white"); dr = ImageDraw.Draw(s)
for i, (f, im) in enumerate(zip(fs, ims)):
    x, y = (i % cols) * (tw + 8), (i // cols) * (th + 26)
    s.paste(im.resize((tw, th)), (x, y + 22)); dr.text((x + 2, y + 2), os.path.basename(f)[:-4], fill="black", font=font)
s.save(outp)
