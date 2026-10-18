# Erzeugt einheitliche Übungs-Thumbnails aus den Everkinetic-Zeichnungen (CC BY-SA 4.0).
# Stil: heller grauer Hintergrund, weiße Figur, graue Linien.
import json, sys, os
import numpy as np
from PIL import Image
from scipy import ndimage
SRC, OUT = sys.argv[1], sys.argv[2]
pose = sys.argv[3] if len(sys.argv) > 3 else 'tension'
os.makedirs(OUT, exist_ok=True)
m = json.load(open(os.path.join(os.path.dirname(__file__), 'figmap.json')))
NAMES = {e['id_num']: e['name'] for e in json.load(open(os.path.join(SRC, '..', '..', 'exercises.json')))}
S, PAD = 192, 17
BG, WHITE, LINE = np.array([218, 221, 219.]), np.array([250, 250, 249.]), np.array([70, 75, 73.])
for num in sorted(set(m.values())):
    p = os.path.join(SRC, num, num + '-' + pose + '.png')
    if not os.path.exists(p):
        nm = NAMES.get(num); k = '2' if pose == 'tension' else '1'
        p = os.path.join(SRC, '..', 'images-web', (nm or '') + '-' + k + '.png')
        if not nm or not os.path.exists(p): print('fehlt', num, nm); continue
    src = Image.open(p).convert('RGBA'); bgw = Image.new('RGBA', src.size, (255, 255, 255, 255)); bgw.alpha_composite(src)
    g = np.asarray(bgw.convert('L')).astype(float)
    ys, xs = np.where(g < 200)
    g = g[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = g.shape; sc = (S - 2 * PAD) / max(h, w)
    k = max(1, round(0.9 / sc)); g = ndimage.grey_erosion(g, size=(k, k))  # Linien kräftiger, wie in der Vorlage
    im = Image.fromarray(g.astype(np.uint8)).resize((max(1, round(w * sc)), max(1, round(h * sc))), Image.LANCZOS)
    c = np.full((S, S), 255.); a = np.asarray(im).astype(float)
    oy, ox = (S - a.shape[0]) // 2, (S - a.shape[1]) // 2
    c[oy:oy + a.shape[0], ox:ox + a.shape[1]] = a
    # Hintergrund = helle Fläche, die mit dem Rand verbunden ist
    lab, _ = ndimage.label(c > 215)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bgm = np.isin(lab, list(edge))
    bgm = ndimage.binary_dilation(bgm, iterations=1) & (c > 150)
    base = np.where(bgm[..., None], BG, WHITE)
    d = np.clip((235 - c) / 200, 0, 1)[..., None]
    out = base * (1 - d) + LINE * d
    Image.fromarray(out.astype(np.uint8)).save(os.path.join(OUT, num + '.jpg'), quality=84, optimize=True)
print('fertig', len(os.listdir(OUT)))
