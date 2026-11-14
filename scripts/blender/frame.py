# ---- Frame chapter machines, and the mecanum wheel
yellowM = M('machine_yellow', '#E8F542', 0.0, 0.45); cast = M('cast_iron', '#4A5052', 0.6, 0.6); mwhite = M('machine_white', '#E9EAE4', 0.0, 0.4)
tool = M('tool_gold', '#D9B23A', 1.0, 0.25); rubber = M('rubber', '#1B1D1E', 0.0, 0.9); wheelY = M('wheel_yellow', '#E6C83A', 0.0, 0.5)
die = M('die_steel', '#6A6456', 1.0, 0.4)

def twist(bm, rfun, z0, z1, n, turns, mat=0, seg=24, tip=0.0):
    rings = []
    for k in range(n + 1):
        t = k / n; z = z0 + (z1 - z0) * t; a0 = t * turns * TAU
        s = 1.0 if tip <= 0 or t > tip else max(0.04, t / tip)            # point at the bottom
        rings.append([bm.verts.new((rfun(i / seg * TAU) * s * math.cos(i / seg * TAU + a0), rfun(i / seg * TAU) * s * math.sin(i / seg * TAU + a0), z)) for i in range(seg)])
    for a, b in zip(rings, rings[1:]):
        for i in range(seg): bm.faces.new((a[i], b[i], b[(i + 1) % seg], a[(i + 1) % seg])).material_index = mat
    bm.faces.new(rings[0][::-1]).material_index = mat; bm.faces.new(rings[-1]).material_index = mat

# CNC spindle head (tool points down, tip of the holder at z = 0)
bm = bmesh.new()
lathe(bm, [(0, 0.0), (0.3, 0.0), (0.36, 0.06), (0.36, 0.3), (0.5, 0.36), (0.5, 0.5), (0.42, 0.56), (0.62, 0.9), (0.78, 0.95), (0.78, 1.15), (0.7, 1.2), (1.0, 1.3), (1.0, 1.42), (0.96, 1.46), (0.96, 1.6), (1.0, 1.64), (1.0, 4.1), (0.92, 4.2), (0, 4.2)], 64, mat=0)
for f in bm.faces:
    zc = f.calc_center_median().z
    f.material_index = 1 if zc < 1.25 else 0
box(bm, (0.5, 0.9, 1.2), (0, -1.1, 3.2), mat=2, bevel=0.06)
finish('F_spindle', bm, [mwhite, steel, plastic], (0, 5), recalc=False)
bm = bmesh.new()
twist(bm, lambda a: 0.19 * (0.62 + 0.38 * abs(math.cos(a)) ** 0.6), -1.3, -0.35, 26, 1.6, tip=0.12)
cyl(bm, 0.19, 0.45, (0, 0, -0.14), seg=24)
finish('F_drill', bm, [tool], (1, 5), sharp=40)
bm = bmesh.new()
twist(bm, lambda a: 0.42 * (0.72 + 0.28 * abs(math.cos(2 * a)) ** 0.5), -1.3, -0.45, 20, 0.5)
cyl(bm, 0.36, 0.55, (0, 0, -0.18), seg=24)
finish('F_mill', bm, [steel], (2, 5), sharp=40)

# Extrusion press: thick container with a cutaway, and three dies with real shaped holes
bm = bmesh.new()
lathe(bm, [(1.36, -2.5), (1.9, -2.5), (2.0, -2.4), (2.0, -1.9), (2.1, -1.85), (2.1, -1.4), (2.0, -1.35), (2.0, 1.35), (2.1, 1.4), (2.1, 1.85), (2.0, 1.9), (2.0, 2.4), (1.9, 2.5), (1.36, 2.5)], 96, closed=True)
cont = finish('F_container', bm, [cast], (0, 6))
c = bmesh.new()
prism(c, [(0, 0)] + [(4 * math.cos(a), 4 * math.sin(a)) for a in [math.radians(-58 + 116 * i / 12) for i in range(13)]], -3, 3)
cut(cont, c)
Wd, Td, K = 4.8, 0.25, 0.3
U = [(-Wd / 2, 0), (Wd / 2, 0), (Wd / 2, -Wd), (Wd / 2 - Td, -Wd), (Wd / 2 - Td, -Td), (-Wd / 2 + Td, -Td), (-Wd / 2 + Td, -Wd), (-Wd / 2, -Wd)]
Lp = [(-Wd / 2, 0), (Wd / 2, 0), (Wd / 2, -Td), (-Wd / 2 + Td, -Td), (-Wd / 2 + Td, -Wd), (-Wd / 2, -Wd)]
def die_obj(name, slot, cutter):
    bm = bmesh.new()
    lathe(bm, [(0, -0.25), (2.1, -0.25), (2.2, -0.15), (2.2, 0.15), (2.1, 0.25), (0, 0.25)], 96)
    o = finish(name, bm, [die], slot)
    c = bmesh.new(); cutter(c); cut(o, c)
    return o
sc = lambda pts: [(x * K * 1.04, (y + Wd / 2) * K * 1.04) for x, y in pts]
die_obj('F_die_u', (1, 6), lambda c: prism(c, sc(U), -1, 1))
die_obj('F_die_l', (2, 6), lambda c: prism(c, sc(Lp), -1, 1))
def tube_cut(c):
    lathe(c, [(Wd / 2 * K - Td * K * 1.6, -1), (Wd / 2 * K * 1.02, -1), (Wd / 2 * K * 1.02, 1), (Wd / 2 * K - Td * K * 1.6, 1)], 48, closed=True)
die_obj('F_die_tube', (3, 6), tube_cut)

# Stamping press frame (bed top at z = -1.0, crown above) and its moving ram
bm = bmesh.new()
prism(bm, [(-3.6, -2.1), (3.6, -2.1), (3.6, 2.1), (-3.6, 2.1)], -1.9, -1.2)                     # bed
prism(bm, [(-3.9, -2.4), (3.9, -2.4), (3.9, 2.4), (-3.9, 2.4)], -2.3, -1.9)                     # foot
prism(bm, [(-2.2, -1.7), (2.2, -1.7), (2.2, 1.7), (-2.2, 1.7)], -1.2, -1.0, mat=1)              # bolster plate
prism(bm, [(-3.6, -2.0), (3.6, -2.0), (3.9, -1.2), (3.9, 1.2), (3.6, 2.0), (-3.6, 2.0), (-3.9, 1.2), (-3.9, -1.2)], 3.75, 4.9)   # crown
bevel_sharp(bm, 0.06, 2, 30)
for sx in (-1, 1):
    for sy in (-1, 1):
        cyl(bm, 0.24, 5.0, (sx * 3.0, sy * 1.5, 1.3), mat=1, seg=28)
        cyl(bm, 0.36, 0.25, (sx * 3.0, sy * 1.5, -1.08), mat=0, seg=28); cyl(bm, 0.36, 0.25, (sx * 3.0, sy * 1.5, 3.65), mat=0, seg=28)
cyl(bm, 1.5, 0.35, (4.15, 0, 4.3), mat=0, seg=48, rot=RY); cyl(bm, 1.25, 0.37, (4.15, 0, 4.3), mat=2, seg=48, rot=RY)   # flywheel
cyl(bm, 0.3, 0.6, (4.2, 0, 4.3), mat=1, seg=20, rot=RY)
cyl(bm, 0.55, 1.4, (-1.5, 0, 5.4), mat=0, seg=28, rot=RY); box(bm, (1.0, 0.9, 0.3), (-1.5, 0, 4.95), mat=0, bevel=0.04)             # motor
cyl(bm, 0.5, 1.3, (0, 0, 3.3), mat=1, seg=28)                                                                                    # connecting rod
box(bm, (1.9, 1.9, 0.02), (0, 0, -0.995), mat=2)                                             # opening the part falls through
for k in (-1, 1): box(bm, (4.2, 0.16, 0.02), (0, k * 1.3, -0.995), mat=2)                    # T-slots
for k in range(6): box(bm, (0.22, 3.6, 0.3), ((k - 2.5) * 1.1, 0, 5.0), mat=0, bevel=0.05)   # ribs on the crown
frame_o = finish('F_press', bm, [cast, steel, plastic], (0, 7), recalc=False)

bm = bmesh.new()
prism(bm, [(-3.4, -1.8), (3.4, -1.8), (3.4, 1.8), (-3.4, 1.8)], -0.45, 0.45)
bevel_sharp(bm, 0.07, 2, 30)
ram = finish('F_ram', bm, [yellowM, steel, cast], (1, 7))
c = bmesh.new()
for sx in (-1, 1):
    for sy in (-1, 1): cyl(c, 0.26, 2, (sx * 3.0, sy * 1.5, 0), seg=28)
cut(ram, c)
c = bmesh.new(); box(c, (4.4, 0.4, 0.5), (0, -1.8, 0)); box(c, (4.4, 0.4, 0.5), (0, 1.8, 0)); cut(ram, c)
bm = bmesh.new(); bm.from_mesh(ram.data)
for sx in (-1, 1):
    for sy in (-1, 1): lathe_f = cyl(bm, 0.4, 0.2, (sx * 3.0, sy * 1.5, 0.5), mat=2, seg=28)
box(bm, (2.6, 2.6, 0.5), (0, 0, -0.7), mat=2, bevel=0.04)
for x, y in ((-0.8, -0.8), (0.8, -0.8), (-0.8, 0.8), (0.8, 0.8)): cyl(bm, 0.19, 0.5, (x, y, -1.15), mat=1, seg=20)
cyl(bm, 0.53, 0.5, (0, 0, -1.15), mat=1, seg=32)
bm.to_mesh(ram.data); bm.free(); smooth(ram.data)

# Mecanum wheel (axis Z): two plates, a hub, nine barrel rollers set at 45 degrees
bm = bmesh.new()
for z in (-0.42, 0.42):
    pts = []
    for i in range(9):
        for k in range(8):
            a = (i + k / 8) / 9 * TAU; r = 1.38 - 0.16 * math.sin(k / 8 * math.pi) ** 2
            pts.append((r * math.cos(a + 0.35), r * math.sin(a + 0.35)))
    prism(bm, pts, z - 0.04, z + 0.04, mat=0)
lathe(bm, [(0.3, -0.5), (0.55, -0.5), (0.62, -0.4), (0.62, 0.4), (0.55, 0.5), (0.3, 0.5)], 6, mat=2, closed=True)
for i in range(9):
    a = i / 9 * TAU
    fs = lathe(bm, [(0, -0.66), (0.17, -0.66), (0.24, -0.5), (0.3, -0.25), (0.32, 0), (0.3, 0.25), (0.24, 0.5), (0.17, 0.66), (0, 0.66)], 16, mat=1)
    vs = list({v for f in fs for v in f.verts})
    bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(45), 3, 'X'), verts=vs)
    bmesh.ops.translate(bm, vec=(1.6, 0, 0), verts=vs)
    bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=RZ(a), verts=vs)
finish('W_mecanum', bm, [wheelY, rubber, steel], (2, 7), recalc=False)
result = stats()
