"""Build the deep-dive part models with Blender and export them as one GLB.
Usage: pip install bpy ; python3 scripts/blender/build.py [preview.png]
Writes public/hub/dive/parts.glb. Each part is a named node; the dives clone them by name."""
import bpy, os, sys, math
here = os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True)
ns = {}
for f in ('lib.py', 'motor.py', 'battery.py', 'frame.py'):
    exec(compile(open(os.path.join(here, f)).read(), f, 'exec'), ns)
for name, (polys, dims) in sorted(ns['result'].items()): print(f'{name:14s} {polys:6d} faces  {dims}')
out = os.path.join(here, '..', '..', 'public', 'hub', 'dive', 'parts.glb')
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True, export_yup=True, export_cameras=False, export_lights=False, export_animations=False, export_tangents=False, export_texcoords=False)
print('wrote', os.path.getsize(out), 'bytes')
if len(sys.argv) > 1:
    from mathutils import Vector
    sc = bpy.context.scene
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = 52
    cam.rotation_euler = (math.radians(55), 0, math.radians(30))
    cam.location = Vector((11, 21, 0)) + cam.rotation_euler.to_matrix() @ Vector((0, 0, 80))
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 4; sun.rotation_euler = (0.7, 0.2, 0.5); sc.collection.objects.link(sun)
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0.8, 0.8, 0.78, 1)
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 24; sc.cycles.device = 'CPU'
    sc.render.resolution_x = 1500; sc.render.resolution_y = 1500; sc.render.filepath = sys.argv[1]
    bpy.ops.render.render(write_still=True)
