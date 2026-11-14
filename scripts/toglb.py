import sys, pickle, numpy as np, trimesh
from trimesh.visual.material import PBRMaterial
d = pickle.load(open(sys.argv[1], 'rb')); sc = trimesh.Scene()
def srgb(c): c=np.array(c); return np.where(c<=0.0031308, c*12.92, 1.055*c**(1/2.4)-0.055)
for (path, key, M, ic) in d['instances']:
    m = d['meshes'][key]
    for j, p in enumerate(m['prims']):
        col = p['color'] or ic or m['color'] or (0.2,0.2,0.2)
        rgb = (srgb(col)*255).astype(np.uint8)
        tm = trimesh.Trimesh(vertices=p['pos'], faces=p['idx'], vertex_normals=p['nrm'], process=False)
        tm.visual = trimesh.visual.TextureVisuals(material=PBRMaterial(baseColorFactor=[*rgb,255], metallicFactor=0.0, roughnessFactor=0.55))
        print(j, rgb, len(p['idx']))
        sc.add_geometry(tm, node_name=f"c{j}", transform=M)
open(sys.argv[2], 'wb').write(trimesh.exchange.gltf.export_glb(sc, include_normals=True))
