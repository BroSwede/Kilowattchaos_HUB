// Shared 3D kit for the "How it's made" deep dives: one small three.js stage plus the
// building blocks (gears, wires, moving electrons, labels) every chapter models with.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export { THREE };

export const C = {
  volt: '#E8F542', ink: '#222624', steel: '#B4B9BB', iron: '#6E7577', dark: '#34393A', black: '#1D2021',
  copper: '#C9773B', brass: '#C9A64B', alu: '#CDD0CF', red: '#D8452B', blue: '#2E63D6', green: '#3E9A5B',
  power: '#C42D6B', orange: '#F07A2A', teal: '#0E8F9E', white: '#F4F4F0', ore: '#A6502F', hot: '#FF8A2A',
};

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (k) => { const x = clamp(k, 0, 1); return x * x * (3 - 2 * x); };
// 0..1 progress of `k` through the window [a, b].
export const span = (k, a, b) => clamp((k - a) / (b - a), 0, 1);
export const TAU = Math.PI * 2;

export function mat(color, o = {}) {
  const m = new THREE.MeshStandardMaterial({
    color, roughness: o.rough ?? 0.5, metalness: o.metal ?? 0,
    transparent: o.opacity !== undefined && o.opacity < 1, opacity: o.opacity ?? 1,
    side: o.double ? THREE.DoubleSide : THREE.FrontSide,
  });
  if (o.glow) { m.emissive = new THREE.Color(o.glow === true ? color : o.glow); m.emissiveIntensity = o.glowPower ?? 0.6; }
  if (o.opacity !== undefined && o.opacity < 1) m.depthWrite = false;
  return m;
}
export const metal = (color, rough = 0.35) => mat(color, { metal: 0.85, rough });
const asMat = (c, o) => (c && c.isMaterial ? c : mat(c, o));

export function mesh(geo, material, pos, rot) {
  const m = new THREE.Mesh(geo, material);
  if (pos) m.position.set(pos[0], pos[1], pos[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  return m;
}
// Cylinder along `axis` ('x' | 'y' | 'z'). `r` can be [top, bottom].
export function cyl(r, h, color, o = {}) {
  const [r1, r2] = Array.isArray(r) ? r : [r, r];
  const g = new THREE.CylinderGeometry(r1, r2, h, o.seg ?? 40, 1, !!o.open, o.start ?? 0, o.theta ?? TAU);
  if (o.axis === 'x') g.rotateZ(-Math.PI / 2);
  else if (o.axis === 'z') g.rotateX(Math.PI / 2);
  return mesh(g, asMat(color, o), o.pos);
}
export function box(w, h, d, color, o = {}) {
  const r = o.r ?? Math.min(w, h, d) * 0.12;
  const g = r > 0 ? new RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d);
  return mesh(g, asMat(color, o), o.pos);
}
export function ball(r, color, o = {}) {
  return mesh(new THREE.SphereGeometry(r, o.seg ?? 20, o.seg ? Math.ceil(o.seg / 2) : 12), asMat(color, o), o.pos);
}
export function group(...kids) {
  const g = new THREE.Group();
  for (const k of kids) if (k) g.add(k);
  return g;
}

// ---- Gears. Teeth are centred on angle 0, 1 pitch, 2 pitches... so chapters can mesh them by phase.
function toothRing(teeth, rRoot, rTip, a0 = 0) {
  const pts = [];
  const p = TAU / teeth;
  const prof = [[-0.5, 0], [-0.3, 0], [-0.16, 1], [0.16, 1], [0.3, 0]];
  for (let i = 0; i < teeth; i++) {
    for (const [f, tip] of prof) {
      const a = a0 + (i + f) * p, r = tip ? rTip : rRoot;
      pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
    }
  }
  return pts;
}
const extrude = (shape, depth, bevel = 0) => {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, curveSegments: 24 });
  g.translate(0, 0, -depth / 2);
  return g;
};
// External spur gear in the XY plane, `width` thick along Z.
export function gearGeo({ teeth, pitchR, m, width, bore = 0, hex = false }) {
  const s = new THREE.Shape(toothRing(teeth, pitchR - 1.2 * m, pitchR + 0.95 * m));
  if (bore > 0) {
    const h = new THREE.Path();
    if (hex) { for (let i = 0; i <= 6; i++) { const a = (i / 6) * TAU; h[i ? 'lineTo' : 'moveTo'](Math.cos(a) * bore, Math.sin(a) * bore); } }
    else h.absarc(0, 0, bore, 0, TAU, true);
    s.holes.push(h);
  }
  return extrude(s, width);
}
// Internal ring gear: teeth point inward. A tooth is centred on angle 0.
export function ringGeo({ teeth, pitchR, m, width, outerR }) {
  const s = new THREE.Shape();
  s.absarc(0, 0, outerR, 0, TAU, false);
  const pts = toothRing(teeth, pitchR + 1.2 * m, pitchR - 0.95 * m).reverse();
  const h = new THREE.Path();
  pts.forEach((p, i) => h[i ? 'lineTo' : 'moveTo'](p.x, p.y));
  h.closePath();
  s.holes.push(h);
  return extrude(s, width);
}
// Any flat outline [[x, y], ...] pushed out along Z, with optional round holes [[x, y, r], ...].
export function plateGeo(outline, depth, holes = [], bevel = 0) {
  const s = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const [x, y, r] of holes) { const h = new THREE.Path(); h.absarc(x, y, r, 0, TAU, true); s.holes.push(h); }
  return extrude(s, depth, bevel);
}

export function curveOf(points, closed = false) {
  return new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])), closed, 'catmullrom', 0.12);
}
export function tube(points, r, color, o = {}) {
  const curve = (points instanceof THREE.Curve) ? points : curveOf(points, o.closed);
  return mesh(new THREE.TubeGeometry(curve, o.steps ?? (Array.isArray(points) ? Math.max(24, points.length * 12) : 96), r, 10, !!o.closed), asMat(color, o));
}

// Glowing dots that run along a curve: electrons in a wire, ions in a cell, chips off a drill.
export class Flow {
  constructor(points, count, { color = C.volt, size = 0.09, closed = false } = {}) {
    this.curve = (points instanceof THREE.Curve) ? points : curveOf(points, closed);
    this.count = count;
    this.phase = 0;
    const m = new THREE.MeshBasicMaterial({ color, toneMapped: false });
    this.object = new THREE.InstancedMesh(new THREE.SphereGeometry(size, 10, 8), m, count);
    this.object.frustumCulled = false;
    this.tmp = new THREE.Object3D();
    this.advance(0);
  }
  advance(d) {
    this.phase = (((this.phase + d) % 1) + 1) % 1;
    for (let i = 0; i < this.count; i++) {
      this.curve.getPointAt((i / this.count + this.phase) % 1, this.tmp.position);
      this.tmp.updateMatrix();
      this.object.setMatrixAt(i, this.tmp.matrix);
    }
    this.object.instanceMatrix.needsUpdate = true;
  }
}

// Make everything under `obj` fade together. Materials are cloned once so shared ones stay untouched.
export function fade(obj, opacity) {
  obj.visible = opacity > 0.01;
  obj.traverse((o) => {
    if (!o.isMesh) return;
    if (!o.userData.fadeMat) { o.material = o.material.clone(); o.userData.fadeMat = true; o.userData.baseOpacity = o.material.opacity; }
    const v = opacity * o.userData.baseOpacity;
    o.material.transparent = v < 0.995;
    o.material.depthWrite = v > 0.6;
    o.material.opacity = v;
  });
}

export function arrow(len, color, r = 0.06) {
  const g = group(
    cyl(r, len * 0.7, color, { pos: [0, len * 0.35, 0], seg: 12, glow: true, glowPower: 0.35 }),
    mesh(new THREE.ConeGeometry(r * 2.6, len * 0.3, 14), mat(color, { glow: true, glowPower: 0.35 }), [0, len * 0.85, 0]),
  );
  return g; // points along +Y
}

// ---------------------------------------------------------------- Stage
export function createStage({ canvas, wrap, labels, reduced = false }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.75;
  pmrem.dispose();
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(6, 12, 8);
  const rim = new THREE.DirectionalLight(0xffffff, 0.7);
  rim.position.set(-8, 4, -6);
  scene.add(key, rim);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 400);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.enablePan = false;
  controls.minDistance = 3;
  controls.maxDistance = 90;

  let world = new THREE.Group();
  scene.add(world);
  let tick = null, raf = 0, alive = true, last = performance.now(), time = 0;
  let cam = null, view = null, labelList = [];
  let frames = 0, slow = 0, dprDropped = false;

  const fitScale = () => Math.max(1, 1.35 / camera.aspect);
  function setView(pos, target, ms = 700) {
    view = { pos: new THREE.Vector3(...pos), target: new THREE.Vector3(...target) };
    const t1 = view.target.clone();
    const p1 = t1.clone().add(view.pos.clone().sub(t1).multiplyScalar(fitScale()));
    if (reduced || ms <= 0) { camera.position.copy(p1); controls.target.copy(t1); controls.update(); cam = null; return; }
    cam = { p0: camera.position.clone(), t0: controls.target.clone(), p1, t1, start: performance.now(), ms };
  }
  controls.addEventListener('start', () => { cam = null; });

  function resize() {
    const w = Math.max(1, wrap.clientWidth), h = Math.max(1, wrap.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(wrap);
  resize();

  // HTML labels pinned to 3D points: crisp text that follows the theme.
  const v = new THREE.Vector3();
  function label(text, target, o = {}) {
    const el = document.createElement('div');
    el.className = `dd-label${o.tone ? ` is-${o.tone}` : ''}`;
    el.textContent = text;
    labels.append(el);
    const L = { el, target, dy: o.dy ?? 0, on: true, off: o.off || null };
    labelList.push(L);
    return {
      show(on) { L.on = !!on; },
      text(s) { el.textContent = s; },
      to(t) { L.target = t; },
    };
  }
  function placeLabels() {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    for (const L of labelList) {
      if (L.target.isObject3D) { L.target.getWorldPosition(v); if (L.off) v.add(L.off); } else v.copy(L.target);
      let shown = L.on;
      if (shown && L.target.isObject3D) { let o = L.target; while (o) { if (!o.visible) { shown = false; break; } o = o.parent; } }
      v.project(camera);
      if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) shown = false;
      L.el.classList.toggle('is-on', shown);
      if (shown) L.el.style.transform = `translate(-50%, -50%) translate(${((v.x * 0.5 + 0.5) * w).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * h + L.dy).toFixed(1)}px)`;
    }
  }

  function frame(now) {
    raf = 0;
    if (!alive) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!document.hidden) {
      time += dt;
      if (cam) {
        const k = clamp((now - cam.start) / cam.ms, 0, 1), e = smooth(k);
        camera.position.lerpVectors(cam.p0, cam.p1, e);
        controls.target.lerpVectors(cam.t0, cam.t1, e);
        if (k >= 1) cam = null;
      }
      controls.update();
      if (tick) tick(dt, time);
      renderer.render(scene, camera);
      placeLabels();
      // Slow device: after a run of long frames, drop to one pixel per pixel and stay there.
      if (!dprDropped) {
        frames += 1;
        if (dt > 0.045) slow += 1;
        if (frames >= 45) { if (slow > 27 && renderer.getPixelRatio() > 1) { renderer.setPixelRatio(1); resize(); dprDropped = true; } frames = 0; slow = 0; }
      }
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  function disposeTree(root) {
    root.traverse((o) => {
      if (!o.isMesh || o.userData.keepGeo) return;
      o.geometry.dispose();
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose();
    });
  }
  function clear() {
    tick = null;
    scene.remove(world);
    disposeTree(world);
    world = new THREE.Group();
    scene.add(world);
    for (const L of labelList) L.el.remove();
    labelList = [];
  }
  function dispose() {
    alive = false;
    cancelAnimationFrame(raf);
    ro.disconnect();
    clear();
    controls.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return {
    THREE, scene, camera, controls, reduced,
    get world() { return world; },
    add(...o) { world.add(...o); return o[0]; },
    setView, label, clear, dispose, disposeTree,
    onTick(fn) { tick = fn; },
    get time() { return time; },
  };
}
