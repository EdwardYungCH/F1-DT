"""第四堂障礙物 3D 打印檔（STL，單位 mm）。
執行：python3 tools/gen_stl.py        → 輸出到 assets/stl/，並檢查每個實體是否密封
      python3 tools/gen_stl.py png    → 另外輸出預覽圖 assets/stl/preview.png

A 平面牆  120×30×100，中空、底部開口，壁厚 1.2 mm（檔案已倒轉：開口向上，打印不需支撐）
B 行人柱  Ø60×120，中空、底部開口，壁厚 1.2 mm（同樣已倒轉）
C 椅腳    Ø12×120 幼柱，底座 80×80×4（兩個重疊實體，切片軟件會自動合併）
D 斜面    底 100×100、高 100，45° 斜面向前（+Y）
E 矮障礙  120×40×20
"""
import os, sys, math, struct, zipfile
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'assets', 'stl')
SEG = 96          # 圓形分段數
WALL = 1.2        # 中空件壁厚（0.4 mm 噴嘴 × 3 圈）
PLA = 1.24        # g/cm³


class Mesh:
    def __init__(self):
        self.v, self.f, self.shells = [], [], []

    def add(self, verts, faces):
        o = len(self.v)
        self.v += [tuple(map(float, p)) for p in verts]
        self.f += [(a + o, b + o, c + o) for a, b, c in faces]
        self.shells.append((len(self.f) - len(faces), len(self.f)))

    def map(self, fn):
        self.v = [fn(*p) for p in self.v]
        return self


def circle(r, n=SEG):
    return [(r * math.cos(2 * math.pi * i / n), r * math.sin(2 * math.pi * i / n)) for i in range(n)]


def rect(w, d):
    return [(-w / 2, -d / 2), (w / 2, -d / 2), (w / 2, d / 2), (-w / 2, d / 2)]


def prism(poly, z0, z1):
    """凸多邊形（逆時針）由 z0 拉伸到 z1，封閉實體。"""
    n = len(poly)
    v = [(x, y, z0) for x, y in poly] + [(x, y, z1) for x, y in poly]
    f = []
    for i in range(n):
        j = (i + 1) % n
        f += [(i, j, n + j), (i, n + j, n + i)]
    for i in range(1, n - 1):
        f += [(0, i + 1, i), (n, n + i, n + i + 1)]
    return v, f


def open_shell(outer, inner, h, t):
    """底部開口的中空殼：外形 outer、內形 inner（同點數、對齊），高 h，頂厚 t。"""
    n = len(outer)
    O0 = [(x, y, 0) for x, y in outer]; O1 = [(x, y, h) for x, y in outer]
    I0 = [(x, y, 0) for x, y in inner]; I1 = [(x, y, h - t) for x, y in inner]
    v = O0 + O1 + I0 + I1
    o0, o1, i0, i1 = 0, n, 2 * n, 3 * n
    f = []
    for i in range(n):
        j = (i + 1) % n
        f += [(o0 + i, o0 + j, o1 + j), (o0 + i, o1 + j, o1 + i)]      # 外壁
        f += [(i0 + i, i1 + j, i0 + j), (i0 + i, i1 + i, i1 + j)]      # 內壁（向內）
        f += [(o0 + i, i0 + i, i0 + j), (o0 + i, i0 + j, o0 + j)]      # 底部環（向下）
    for i in range(1, n - 1):
        f += [(o1, o1 + i, o1 + i + 1)]                                # 頂面
        f += [(i1, i1 + i + 1, i1 + i)]                                # 內頂（向下）
    return v, f


def flip_for_print(m, h):
    """繞 X 軸轉 180°：開口向上，頂面貼平台。"""
    return m.map(lambda x, y, z: (x, -y, h - z))


def part_A():
    m = Mesh(); w, d, h = 120, 30, 100
    m.add(*open_shell(rect(w, d), rect(w - 2 * WALL, d - 2 * WALL), h, WALL))
    return flip_for_print(m, h)


def part_B():
    m = Mesh(); r, h = 30, 120
    m.add(*open_shell(circle(r), circle(r - WALL), h, WALL))
    return flip_for_print(m, h)


def part_C():
    m = Mesh()
    m.add(*prism(rect(80, 80), 0, 4))
    m.add(*prism(circle(6, 64), 3, 124))   # 插入底座 1 mm，確保合併
    return m


def part_D():
    m = Mesh()
    m.add(*prism([(0, 0), (100, 0), (0, 100)], 0, 100))   # (u,v) 三角形，沿 w 拉伸
    # (u,v,w) → (x=w, y=u, z=v)：Y 為深度，Z 為高度，斜面向 +Y
    return m.map(lambda u, v, w: (w - 50, u - 50, v))


def part_E():
    m = Mesh(); m.add(*prism(rect(120, 40), 0, 20)); return m


PARTS = [
    ('L4-A-wall-120x30x100', '平面牆', part_A, '中空，開口向上打印'),
    ('L4-B-person-D60x120', '行人柱', part_B, '中空，開口向上打印'),
    ('L4-C-chair-leg-D12x120', '椅腳', part_C, '慢速打印'),
    ('L4-D-wedge-45deg-100', '斜面', part_D, '長方形底面貼平台'),
    ('L4-E-low-block-120x40x20', '矮障礙', part_E, ''),
]


def check(m):
    """每個實體：每條邊剛好被兩個三角形以相反方向共用（密封、法線一致），體積為正。"""
    V = np.array(m.v); vols = []
    for s, e in m.shells:
        edges = {}
        for a, b, c in m.f[s:e]:
            for p, q in ((a, b), (b, c), (c, a)):
                edges[(p, q)] = edges.get((p, q), 0) + 1
        for (p, q), k in edges.items():
            if k != 1 or edges.get((q, p)) != 1:
                return False, 0
        T = V[np.array(m.f[s:e])]
        vols.append(np.einsum('ij,ij->i', T[:, 0], np.cross(T[:, 1], T[:, 2])).sum() / 6)
    return all(x > 0 for x in vols), sum(vols)


def write_stl(m, path, name):
    V = np.array(m.v, dtype=np.float64)
    with open(path, 'wb') as fh:
        fh.write(name.encode('ascii')[:80].ljust(80, b' '))
        fh.write(struct.pack('<I', len(m.f)))
        for a, b, c in m.f:
            p, q, r = V[a], V[b], V[c]
            nrm = np.cross(q - p, r - p); L = np.linalg.norm(nrm)
            nrm = nrm / L if L else nrm
            fh.write(struct.pack('<12fH', *nrm, *p, *q, *r, 0))


def preview(meshes, path):
    import matplotlib; matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from mpl_toolkits.mplot3d.art3d import Poly3DCollection
    fig = plt.figure(figsize=(15, 3.6))
    for k, (fname, zh, m) in enumerate(meshes):
        ax = fig.add_subplot(1, len(meshes), k + 1, projection='3d')
        V = np.array(m.v); T = V[np.array(m.f)]
        ax.add_collection3d(Poly3DCollection(T, facecolor='#f59e0b', edgecolor='#92400e', linewidths=0.05, alpha=0.95))
        lo, hi = V.min(0), V.max(0); c = (lo + hi) / 2; s = (hi - lo).max() / 2
        ax.set_xlim(c[0] - s, c[0] + s); ax.set_ylim(c[1] - s, c[1] + s); ax.set_zlim(0, 2 * s)
        ax.set_box_aspect((1, 1, 1)); ax.view_init(22, -60); ax.set_axis_off()
        dim = hi - lo
        ax.set_title(f'{fname.split("-")[1]}  {dim[0]:.0f}×{dim[1]:.0f}×{dim[2]:.0f} mm', fontsize=10)
    plt.tight_layout(); plt.savefig(path, dpi=110); plt.close(fig)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    built, ok_all = [], True
    for fname, zh, fn, note in PARTS:
        m = fn(); ok, vol = check(m)
        V = np.array(m.v); V -= [V[:, 0].min() - 0, V[:, 1].min() - 0, 0]   # 移到正象限
        m.v = [tuple(p) for p in V]
        lo, hi = V.min(0), V.max(0)
        write_stl(m, os.path.join(OUT, fname + '.stl'), fname)
        cm3 = vol / 1000
        print(f"{'✔' if ok else '✘'} {fname}.stl  {zh}  外形 {hi[0]-lo[0]:.0f}×{hi[1]-lo[1]:.0f}×{hi[2]-lo[2]:.0f} mm  "
              f"三角形 {len(m.f)}  實心體積 {cm3:.0f} cm³（實心重 {cm3*PLA:.0f} g）  {note}")
        ok_all &= ok; built.append((fname, zh, m))
    with zipfile.ZipFile(os.path.join(OUT, 'L4-obstacles-STL.zip'), 'w', zipfile.ZIP_DEFLATED) as z:
        for fname, _, _ in built: z.write(os.path.join(OUT, fname + '.stl'), fname + '.stl')
    if 'png' in sys.argv: preview(built, os.path.join(OUT, 'preview.png'))
    print('全部密封' if ok_all else '有實體未密封')
    sys.exit(0 if ok_all else 1)
