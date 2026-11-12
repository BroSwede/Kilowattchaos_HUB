# Shared helpers for the deep-dive part models. Runs inside Blender (bpy 5.x), data API only (no bpy.ops).
# Convention: every part is built around its own origin with its main axis along Blender Z,
# which becomes Y in three.js after the glTF export. 1 unit is roughly 10 mm.
import bpy, bmesh, math
from mathutils import Vector, Matrix
D = bpy.data
COL = bpy.context.scene.collection
TAU = math.tau

def lin(h):
    h = h.lstrip('#')
    def f(c):
        c = int(c, 16) / 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (f(h[0:2]), f(h[2:4]), f(h[4:6]))

def M(name, hexcol, metal=0.0, rough=0.5, alpha=1.0):
    m = D.materials.get(name) or D.materials.new(name)
    m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (*lin(hexcol), 1)
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
        try: m.surface_render_method = 'BLENDED'
        except Exception: pass
    return m

def finish(name, bm, mats, slot=(0, 0), sharp=32, recalc=True):
    if recalc: bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    old = D.objects.get(name)
    if old: D.objects.remove(old)
    me = D.meshes.new(name)
    bm.to_mesh(me); bm.free()
    for m in mats: me.materials.append(m)
    smooth(me, sharp)
    o = D.objects.new(name, me)
    COL.objects.link(o)
    o.location = (slot[0] * 6.0, slot[1] * 6.0, 0)
    return o

def smooth(me, sharp=32):
    me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    me.set_sharp_from_angle(angle=math.radians(sharp))
    me.update()

def lathe(bm, prof, seg=64, mat=0, closed=False):
    """Spin an (r, z) profile round Z. A point with r == 0 becomes a single pole vertex."""
    rings = []
    for r, z in prof:
        if r < 1e-6: rings.append([bm.verts.new((0, 0, z))])
        else: rings.append([bm.verts.new((r * math.cos(i / seg * TAU), r * math.sin(i / seg * TAU), z)) for i in range(seg)])
    n = len(rings)
    out = []
    for k in range(n if closed else n - 1):
        a, b = rings[k], rings[(k + 1) % n]
        for i in range(seg):
            j = (i + 1) % seg
            if len(a) == 1 and len(b) == 1: continue
            if len(a) == 1: vs = (a[0], b[i], b[j])
            elif len(b) == 1: vs = (a[i], b[0], a[j])
            else: vs = (a[i], b[i], b[j], a[j])
            f = bm.faces.new(vs); f.material_index = mat; out.append(f)
    return out

def prism(bm, pts, z0, z1, mat=0, holes=None):
    """Push a flat outline [(x, y)] from z0 to z1. Returns new faces."""
    lo = [bm.verts.new((x, y, z0)) for x, y in pts]
    hi = [bm.verts.new((x, y, z1)) for x, y in pts]
    fs = [bm.faces.new(lo[::-1]), bm.faces.new(hi)]
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        fs.append(bm.faces.new((lo[i], lo[j], hi[j], hi[i])))
    for f in fs: f.material_index = mat
    return fs

def box(bm, size, center=(0, 0, 0), mat=0, rot=None, bevel=0.0, segs=2):
    r = bmesh.ops.create_cube(bm, size=1.0)
    vs = r['verts']
    bmesh.ops.scale(bm, vec=size, verts=vs)
    if bevel > 0:
        es = list({e for v in vs for e in v.link_edges})
        res = bmesh.ops.bevel(bm, geom=es, offset=bevel, segments=segs, affect='EDGES', profile=0.5)
        vs = list({v for f in res['faces'] for v in f.verts} | {v for v in vs if v.is_valid})
    fs = list({f for v in vs for f in v.link_faces})
    for f in fs: f.material_index = mat
    if rot is not None: bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=rot, verts=vs)
    bmesh.ops.translate(bm, vec=center, verts=vs)
    return vs

def cyl(bm, r, h, center=(0, 0, 0), mat=0, seg=32, rot=None, r2=None):
    res = bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h)
    vs = res['verts']
    for f in {f for v in vs for f in v.link_faces}: f.material_index = mat
    if rot is not None: bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=rot, verts=vs)
    bmesh.ops.translate(bm, vec=center, verts=vs)
    return vs

RX = Matrix.Rotation(math.pi / 2, 3, 'X')   # Z axis -> -Y
RY = Matrix.Rotation(math.pi / 2, 3, 'Y')   # Z axis -> X
def RZ(a): return Matrix.Rotation(a, 3, 'Z')

def sector(r0, r1, a0, a1, n=24):
    out = [(r1 * math.cos(a0 + (a1 - a0) * i / n), r1 * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]
    inn = [(r0 * math.cos(a1 - (a1 - a0) * i / n), r0 * math.sin(a1 - (a1 - a0) * i / n)) for i in range(n + 1)] if r0 > 0 else [(0, 0)]
    return out + inn

def bevel_sharp(bm, offset, segs=2, angle=40):
    es = [e for e in bm.edges if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(angle)]
    bmesh.ops.bevel(bm, geom=es, offset=offset, segments=segs, affect='EDGES', profile=0.5)

def tube(bm, path, r, sides=6, mat=0, closed=True, normal=Vector((1, 0, 0))):
    """Sweep a circle along a path of Vectors lying in the plane whose normal is `normal`."""
    n = len(path); rings = []
    for i, p in enumerate(path):
        t = (path[(i + 1) % n] - path[i - 1]) if closed or 0 < i < n - 1 else (path[min(i + 1, n - 1)] - path[max(i - 1, 0)])
        t.normalize()
        b = t.cross(normal).normalized()
        rings.append([bm.verts.new(p + (normal * math.cos(k / sides * TAU) + b * math.sin(k / sides * TAU)) * r) for k in range(sides)])
    for i in range(n if closed else n - 1):
        a, b2 = rings[i], rings[(i + 1) % n]
        for k in range(sides):
            f = bm.faces.new((a[k], b2[k], b2[(k + 1) % sides], a[(k + 1) % sides])); f.material_index = mat
    if not closed:
        bm.faces.new(rings[0][::-1]).material_index = mat; bm.faces.new(rings[-1]).material_index = mat

def racetrack(a, b, rc, x, n=5):
    """Rounded rectangle in the YZ plane at height x: half-width a along Y, half-length b along Z."""
    pts = []
    for cy, cz, a0 in ((a - rc, b - rc, 0), (-(a - rc), b - rc, math.pi / 2), (-(a - rc), -(b - rc), math.pi), (a - rc, -(b - rc), 1.5 * math.pi)):
        for i in range(n + 1):
            t = a0 + (math.pi / 2) * i / n
            pts.append(Vector((x, cy + rc * math.cos(t), cz + rc * math.sin(t))))
    return pts

def cut(target, cutter_bm, op='DIFFERENCE'):
    """Boolean a bmesh cutter out of an object, baking the result."""
    bmesh.ops.recalc_face_normals(cutter_bm, faces=cutter_bm.faces[:])
    cm = D.meshes.new('cutter'); cutter_bm.to_mesh(cm); cutter_bm.free()
    for m in target.data.materials: cm.materials.append(m)
    c = D.objects.new('cutter', cm); COL.objects.link(c); c.location = target.location
    md = target.modifiers.new('b', 'BOOLEAN'); md.operation = op; md.object = c; md.solver = 'EXACT'
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    me = D.meshes.new_from_object(target.evaluated_get(dg))
    target.modifiers.clear()
    old = target.data; target.data = me; me.name = target.name
    D.meshes.remove(old); D.objects.remove(c); D.meshes.remove(cm)
    smooth(me)
    return target

def stats():
    return {o.name: [len(o.data.polygons), [round(d, 2) for d in o.dimensions]] for o in D.objects if o.type == 'MESH'}
