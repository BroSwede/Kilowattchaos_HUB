# ---- Battery parts
wrapG = M('cell_sleeve', '#2B8A57', 0.0, 0.38); white = M('insulator', '#F1EFE4', 0.0, 0.7)
nylon = M('xt_yellow', '#F2C230', 0.0, 0.45); pink = M('pack_wrap', '#C42D6B', 0.0, 0.33)
fuseY = M('fuse_yellow', '#E9C53A', 0.0, 0.25, 0.8); lime = M('volt', '#E8F542', 0.0, 0.45)
hubB = M('hub_body', '#2B2F30', 0.0, 0.5); orange = M('rev_orange', '#F07A2A', 0.0, 0.5); port = M('port', '#0E0F10', 0.0, 0.7)

# One cell, standing up, + button at the top (+Z). R 0.55, 2.1 tall.
bm = bmesh.new()
lathe(bm, [(0, -1.05), (0.5, -1.05), (0.54, -1.01), (0.54, 0.74), (0.5, 0.78), (0.5, 0.84), (0.54, 0.88), (0.54, 0.97), (0.5, 1.0), (0.4, 1.0)], 48, mat=0)
lathe(bm, [(0.4, 1.0), (0.24, 1.0)], 48, mat=2)
lathe(bm, [(0.24, 1.0), (0.2, 1.0), (0.2, 1.08), (0.17, 1.11), (0, 1.11)], 48, mat=0)
lathe(bm, [(0.44, -1.058), (0.52, -1.052), (0.556, -1.0), (0.556, 0.73), (0.52, 0.775)], 48, mat=1)
bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
finish('B_cell', bm, [steel, wrapG, white], (0, 3), recalc=False)

# Shrink wrap: hugs the two staggered rows of five cells, so you can see every bump
P, RS = 1.125, 0.974
centers = [((i - 2) * P - P / 4, RS / 2) for i in range(5)] + [((i - 2) * P + P / 4, -RS / 2) for i in range(5)]
def outline(R, n=260):
    pts = []
    for k in range(n):
        a = k / n * TAU; dx, dy = math.cos(a), math.sin(a); best = 0
        for cx, cy in centers:
            b = dx * cx + dy * cy; d = b * b - (cx * cx + cy * cy - R * R)
            if d >= 0: best = max(best, b + math.sqrt(d))
        pts.append((dx * best, dy * best))
    # soften the valleys a little, the way shrink film bridges them
    for _ in range(3): pts = [((pts[i - 1][0] + 2 * pts[i][0] + pts[(i + 1) % n][0]) / 4, (pts[i - 1][1] + 2 * pts[i][1] + pts[(i + 1) % n][1]) / 4) for i in range(n)]
    return pts
O = outline(0.6)
bm = bmesh.new()
levels = [(-1.2, 0.80), (-1.25, 0.93), (-1.2, 1.0), (1.2, 1.0), (1.25, 0.93), (1.2, 0.80)]
rings = [[bm.verts.new((x * s, y * (1 - (1 - s) * 2.2), z)) for x, y in O] for z, s in levels]
for a, b in zip(rings, rings[1:]):
    for i in range(len(O)): bm.faces.new((a[i], b[i], b[(i + 1) % len(O)], a[(i + 1) % len(O)]))
finish('B_wrap', bm, [pink], (1, 3), sharp=50)
bm = bmesh.new()
rings = [[bm.verts.new((x * 1.004, y * 1.008, z)) for x, y in O] for z in (-0.45, 0.45)]
for i in range(len(O)): bm.faces.new((rings[0][i], rings[1][i], rings[1][(i + 1) % len(O)], rings[0][(i + 1) % len(O)]))
finish('B_label', bm, [plastic], (2, 3), sharp=50)

# XT30 plug: keyed nylon body, two gold sockets, grip ribs
bm = bmesh.new()
prism(bm, [(-0.36, -0.25), (0.36, -0.25), (0.36, 0.13), (0.24, 0.25), (-0.24, 0.25), (-0.36, 0.13)], -0.38, 0.38, mat=0)
bevel_sharp(bm, 0.025, 2, 30)
for s in (-1, 1):
    lathe_vs = lathe(bm, [(0.06, 0.2), (0.11, 0.2), (0.11, 0.62), (0.085, 0.66), (0.06, 0.66)], 16, mat=1, closed=True)
    bmesh.ops.translate(bm, vec=(s * 0.16, 0, 0), verts=list({v for f in lathe_vs for v in f.verts}))
    cyl(bm, 0.1, 0.25, (s * 0.16, 0, -0.5), mat=1, seg=14)
for k in range(4): box(bm, (0.76, 0.03, 0.05), (0, -0.26, -0.24 + k * 0.1), mat=0)
finish('B_xt30', bm, [nylon, brass], (3, 3), recalc=False)

# Blade fuse: see-through body, two legs, the thin link you can see inside
bm = bmesh.new()
prism(bm, [(-0.3, -0.12), (0.3, -0.12), (0.3, 0.18), (0.2, 0.3), (-0.2, 0.3), (-0.3, 0.18)], -0.09, 0.09, mat=0)
for s in (-1, 1): box(bm, (0.13, 0.5, 0.035), (s * 0.19, -0.2, 0), mat=1)
box(bm, (0.38, 0.03, 0.03), (0, 0.12, 0), mat=1)
o = finish('B_fuse', bm, [fuseY, steel], (4, 3), recalc=False)

# Control Hub: a flat brick of electronics with ports down two sides
bm = bmesh.new()
prism(bm, [(-1.7, -1.2), (1.7, -1.2), (1.7, 1.2), (-1.7, 1.2)], -0.45, 0.45)
bevel_sharp(bm, 0.09, 3, 30)
hub = finish('HUB', bm, [hubB, lime, port, brass, orange], (0, 4))
c = bmesh.new(); box(c, (2.1, 1.5, 0.12), (0.45, 0, 0.45), bevel=0.05); cut(hub, c)                 # label recess on top
c = bmesh.new()
for k in range(8): box(c, (0.07, 1.6, 0.1), (-1.5 + k * 0.1, 0, 0.45))                                # heat fins
cut(hub, c)
c = bmesh.new()
for k in range(8): box(c, (0.3, 0.2, 0.22), (-1.4 + k * 0.4, -1.2, 0.12)); box(c, (0.3, 0.2, 0.22), (-1.4 + k * 0.4, 1.2, 0.12))   # motor and servo ports
cut(hub, c)
c = bmesh.new(); box(c, (0.2, 0.5, 0.3), (1.7, -0.5, 0.05)); box(c, (0.2, 0.36, 0.2), (1.7, 0.4, 0.05)); cut(hub, c)   # power and USB
bm = bmesh.new(); bm.from_mesh(hub.data)
box(bm, (1.8, 1.2, 0.02), (0.45, 0, 0.4), mat=1, bevel=0)
box(bm, (0.5, 0.3, 0.022), (-0.1, 0.3, 0.401), mat=4)
for k in range(8):
    for s in (-1, 1):
        box(bm, (0.26, 0.1, 0.16), (-1.4 + k * 0.4, s * 1.13, 0.12), mat=2)
        for q in range(3): box(bm, (0.03, 0.12, 0.03), (-1.4 + k * 0.4 + (q - 1) * 0.07, s * 1.14, 0.12), mat=3)
box(bm, (0.1, 0.44, 0.24), (1.63, -0.5, 0.05), mat=2); box(bm, (0.1, 0.3, 0.14), (1.63, 0.4, 0.05), mat=3)
for sx in (-1, 1):
    for sy in (-1, 1): cyl(bm, 0.09, 0.03, (sx * 1.55, sy * 1.05, 0.455), mat=3, seg=12)
bm.to_mesh(hub.data); bm.free(); smooth(hub.data)
