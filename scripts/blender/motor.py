# ---- Motor parts
steel = M('steel', '#B4B9BB', 1.0, 0.32); dsteel = M('dark_steel', '#3B4042', 1.0, 0.42)
copper = M('copper', '#C9773B', 1.0, 0.3); brass = M('brass', '#C9A64B', 1.0, 0.3)
plastic = M('black_plastic', '#1D2021', 0.0, 0.55); carbon = M('carbon', '#15171A', 0.0, 0.85)
lam = M('lamination', '#8C9396', 1.0, 0.5); magN = M('magnet_n', '#D8452B', 0.0, 0.5); cream = M('cream', '#E9E6D8', 0.0, 0.6)
pcb = M('pcb', '#1F7A45', 0.0, 0.5)

# Steel can with a machined cutaway window and cooling slots
bm = bmesh.new()
lathe(bm, [(1.50, -1.80), (1.70, -1.80), (1.75, -1.75), (1.75, 1.72), (1.80, 1.74), (1.80, 1.80), (1.66, 1.80), (1.66, -1.70), (1.50, -1.70)], 96, closed=True)
can = finish('M_can', bm, [dsteel], (0, 0))
c = bmesh.new()
prism(c, [(0, 0)] + [(3 * math.cos(a), 3 * math.sin(a)) for a in [math.radians(-56 + 112 * i / 12) for i in range(13)]], -1.42, 1.48)
cut(can, c)
c = bmesh.new()
for k in range(5):
    a = math.radians(110 + k * 35)
    vs = box(c, (0.8, 0.42, 0.13), (1.7, 0, 1.25))
    bmesh.ops.rotate(c, cent=(0, 0, 0), matrix=RZ(a), verts=vs)
cut(can, c)

# End bell with brush holders, brushes and terminals
bm = bmesh.new()
lathe(bm, [(0.2, -0.18), (1.62, -0.18), (1.66, -0.14), (1.66, 0.08), (1.56, 0.16), (0.62, 0.16), (0.62, 0.34), (0.56, 0.4), (0.2, 0.4)], 72, closed=True)
for s in (1, -1):
    box(bm, (0.72, 0.36, 0.34), (s * 1.02, 0, 0.33), mat=1, bevel=0.03)
    box(bm, (0.5, 0.24, 0.22), (s * 0.63, 0, 0.33), mat=2, bevel=0.015)
    box(bm, (0.3, 0.05, 0.75), (s * 1.2, 0.5, -0.4), mat=1, bevel=0.01)
    cyl(bm, 0.13, 0.08, (0, s * 1.3, -0.21), mat=3, seg=16)
finish('M_endbell', bm, [plastic, brass, carbon, steel], (1, 0), recalc=False)

# Encoder cover, a cup with a plug socket on its rim
bm = bmesh.new()
lathe(bm, [(0, -0.4), (1.2, -0.4), (1.24, -0.36), (1.42, -0.36), (1.5, -0.28), (1.5, 0.4), (1.44, 0.4), (1.44, -0.26), (1.38, -0.3), (0, -0.3)], 72)
box(bm, (0.85, 0.34, 0.46), (0, -1.5, 0.05), mat=0, bevel=0.04)
box(bm, (0.62, 0.06, 0.26), (0, -1.68, 0.05), mat=1, bevel=0)
for i in range(4): box(bm, (0.05, 0.1, 0.05), (-0.21 + i * 0.14, -1.71, 0.05), mat=2)
finish('M_enc_cap', bm, [plastic, cream, brass], (2, 0), recalc=False)

# Encoder board with two Hall sensor chips
bm = bmesh.new()
lathe(bm, [(0.25, -0.03), (1.25, -0.03), (1.25, 0.03), (0.25, 0.03)], 48, closed=True)
for s in (1, -1):
    box(bm, (0.3, 0.3, 0.12), (0.62, s * 0.32, 0.09), mat=1, bevel=0.02)
    for k in range(3): box(bm, (0.42, 0.04, 0.03), (0.62, s * 0.32 + (k - 1) * 0.1, 0.045), mat=2)
box(bm, (0.5, 0.3, 0.1), (-0.7, 0, 0.08), mat=1, bevel=0.02)
for k in range(6): cyl(bm, 0.05, 0.05, (-0.2 + 0.0, 0, 0), mat=2, seg=8) if False else None
finish('M_enc_board', bm, [pcb, plastic, steel], (3, 0), recalc=False)

# Rotor core: a stack of thin steel plates, each with five T-shaped teeth
def lam_profile():
    pts = []; hub, r1, r2, sw, beta = 0.42, 0.98, 1.24, 0.17, 0.5
    for i in range(5):
        a = i / 5 * TAU
        loc = [(hub, -sw), (r1, -sw), (math.cos(beta) * r1, -math.sin(beta) * r1)]
        loc += [(math.cos(-beta + 2 * beta * k / 8) * r2, math.sin(-beta + 2 * beta * k / 8) * r2) for k in range(9)]
        loc += [(math.cos(beta) * r1, math.sin(beta) * r1), (r1, sw), (hub, sw)]
        pts += [(x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a)) for x, y in loc]
    return pts
bm = bmesh.new(); P = lam_profile()
for k in range(24): prism(bm, P, -1.2 + k * 0.1 + 0.006, -1.2 + k * 0.1 + 0.094)
prism(bm, [(0.44 * math.cos(i / 24 * TAU), 0.44 * math.sin(i / 24 * TAU)) for i in range(24)], -1.2, 1.2, mat=1)
finish('M_stack', bm, [lam, dsteel], (0, 1), sharp=20)

# One wound coil (for the tooth pointing along +X): real loops of wire, stacked in layers
bm = bmesh.new()
for k in range(6):
    x = 0.5 + k * 0.082
    tube(bm, racetrack(0.222, 1.262, 0.12, x), 0.043, 6)
    tube(bm, racetrack(0.305, 1.345, 0.2, x + 0.02), 0.043, 6)
finish('M_coil', bm, [copper], (1, 1), sharp=60)

# Commutator: five copper bars with wire hooks, on an insulating core
bm = bmesh.new()
lathe(bm, [(0.16, -0.3), (0.3, -0.3), (0.3, 0.3), (0.16, 0.3)], 32, mat=1, closed=True)
for i in range(5):
    a0 = i / 5 * TAU + 0.07; a1 = (i + 1) / 5 * TAU - 0.07
    prism(bm, sector(0.27, 0.4, a0, a1, 8), -0.28, 0.2, mat=0)
    prism(bm, sector(0.27, 0.5, a0 + 0.35, a1 - 0.35, 3), 0.2, 0.28, mat=0)
finish('M_commutator', bm, [copper, plastic], (2, 1), sharp=25)

# One curved magnet (centred on +X)
bm = bmesh.new()
prism(bm, sector(1.36, 1.66, math.radians(-63), math.radians(63), 28), -1.25, 1.25)
bevel_sharp(bm, 0.035, 2, 60)
finish('M_magnet', bm, [magN], (3, 1), sharp=40)

# Gearbox front plate with countersunk mounting holes and the bearing boss
bm = bmesh.new()
lathe(bm, [(0.42, -0.15), (1.7, -0.15), (1.75, -0.1), (1.75, 0.1), (1.7, 0.15), (0.78, 0.15), (0.78, 0.55), (0.72, 0.62), (0.6, 0.62), (0.6, 0.56), (0.5, 0.56), (0.5, 0.62), (0.42, 0.62)], 96, closed=True)
front = finish('M_front', bm, [dsteel], (0, 2))
c = bmesh.new()
for sx in (1, -1):
    for sy in (1, -1):
        cyl(c, 0.14, 1, (sx * 0.9, sy * 0.9, 0), seg=20)
        cyl(c, 0.14, 0.14, (sx * 0.9, sy * 0.9, 0.1), seg=20, r2=0.28)
cut(front, c)

# Hex output shaft with chamfered ends
bm = bmesh.new()
lathe(bm, [(0, -1.0), (0.3, -1.0), (0.36, -0.94), (0.36, 0.94), (0.3, 1.0), (0, 1.0)], 6)
finish('M_shaft', bm, [steel], (1, 2), sharp=20)

result = stats()
