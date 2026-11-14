// Shared props for the "How it works" dives: a mecanum wheel with real angled rollers, a small StarterBot,
// a patch of field, a gamepad and a screen that chapters can draw graphs on.
import { THREE, C, mat, metal, plastic, mesh, cyl, box, ball, group, part, plateGeo, clamp, TAU } from './kit.js';
import { miniMotor } from './motor.js';

// ---- A mecanum wheel. Axle along X. `hand` is +1 or -1: which way the rollers lean.
// The roller touching the floor of a hand +1 wheel points forward and to the right (toward -Z and +X).
export function mecanumWheel(R = 1, width = 0.8, hand = 1, { rollers = 10, tint = C.volt, lean = Math.PI / 4 } = {}) {
  const spin = group();
  const rr = R * 0.2, len = width * 1.28, pathR = R - rr;
  // Barrel profile: fat in the middle, so the row of rollers makes one round tyre when seen from the side.
  const pts = [];
  for (let i = 0; i <= 12; i++) { const k = i / 12 - 0.5; pts.push(new THREE.Vector2(Math.max(0.02, rr * (1 - 1.75 * k * k)), k * len)); }
  const rollGeo = new THREE.LatheGeometry(pts, 18);
  const rubber = mat('#232627', { rough: 0.85 });
  const pin = metal(C.steel, 0.3);
  const pinGeo = new THREE.CylinderGeometry(rr * 0.2, rr * 0.2, len * 1.12, 8);
  const X = new THREE.Vector3(1, 0, 0), up = new THREE.Vector3(0, 1, 0);
  const list = [];
  for (let i = 0; i < rollers; i++) {
    const a = (i / rollers) * TAU;
    const T = new THREE.Vector3(0, -Math.sin(a), Math.cos(a));
    const dir = X.clone().multiplyScalar(Math.cos(lean)).addScaledVector(T, hand * Math.sin(lean)).normalize();
    const holder = group();
    holder.position.set(0, Math.cos(a) * pathR, Math.sin(a) * pathR);
    holder.quaternion.setFromUnitVectors(up, dir);
    const roll = mesh(rollGeo, rubber);
    holder.add(roll, mesh(pinGeo, pin));
    spin.add(holder);
    list.push({ holder, roll, a });
  }
  // Two side plates with a finger for every roller, and a hub between them.
  const fingers = [];
  for (let i = 0; i < rollers; i++) {
    for (const [da, r] of [[-0.5, 0.52], [-0.16, 0.52], [-0.1, 0.86], [0.1, 0.86], [0.16, 0.52]]) { const a = ((i + da) / rollers) * TAU; fingers.push([Math.cos(a) * R * r, Math.sin(a) * R * r]); }
  }
  const holes = [];
  for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; holes.push([Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3, R * 0.085]); }
  const plateG = plateGeo(fingers, width * 0.07, holes);
  plateG.rotateY(Math.PI / 2);
  const plateM = mat('#B4B9BB', { metal: 0.85, rough: 0.34 });
  for (const s of [-1, 1]) {
    const p = mesh(plateG, plateM, [s * width * 0.56, 0, 0]);
    p.rotation.x = s * hand * 0.31 + Math.PI / 2;
    spin.add(p);
  }
  spin.add(cyl(R * 0.26, width * 1.22, plastic(tint, 0.4), { axis: 'x', seg: 28 }), cyl(R * 0.42, width * 0.5, mat('#2B2F30', { metal: 0.6, rough: 0.45 }), { axis: 'x', seg: 28 }), cyl(R * 0.09, width * 1.5, metal(C.steel, 0.25), { axis: 'x', seg: 6 }));
  const g = group(spin);
  return { g, spin, rollers: list, R, hand };
}

// ---- A small StarterBot seen as a drive base. Forward is -Z, right is +X, wheels sit at the corners.
// wheels = [fl, fr, bl, br]; each has .spin (turn about X) and .at (a point above it for labels and arrows).
export function miniBot({ k = 1, top = true, tank = false } = {}) {
  const g = group();
  const alu = () => metal(C.alu, 0.38);
  const L = 3.3, W = 2.5, R = 0.62;
  for (const s of [-1, 1]) {
    g.add(box(0.36, 0.42, L, alu(), { r: 0.04, pos: [s * (W / 2 - 0.32), 0.62, 0] }));
    for (let i = -5; i <= 5; i++) g.add(cyl(0.07, 0.38, C.dark, { axis: 'x', seg: 10, pos: [s * (W / 2 - 0.32), 0.62, i * 0.28] }));
  }
  for (const z of [-1.05, 1.05]) g.add(box(W - 0.9, 0.36, 0.42, alu(), { r: 0.04, pos: [0, 0.62, z] }));
  g.add(box(W - 1.0, 0.07, 1.7, mat('#2B2F30', { metal: 0.5, rough: 0.5 }), { r: 0.02, pos: [0, 0.86, 0] }));
  const wheels = [];
  for (const [sx, sz, hand] of [[-1, -1, 1], [1, -1, -1], [-1, 1, -1], [1, 1, 1]]) {
    const spin = tank
      ? group(cyl(R, 0.5, mat('#232627', { rough: 0.85 }), { axis: 'x', seg: 40 }), cyl(R * 0.62, 0.54, plastic(C.volt, 0.4), { axis: 'x', seg: 32 }), cyl(R * 0.2, 0.6, metal(C.steel, 0.3), { axis: 'x', seg: 6 }), box(0.56, R * 1.1, 0.16, C.dark, { r: 0.03 }), box(0.56, 0.16, R * 1.1, C.dark, { r: 0.03 }))
      : group(part('W_mecanum', { axis: 'x', scale: [R / 1.9, -hand * (R / 1.9), R / 1.9] }));
    spin.position.set(sx * (W / 2 + 0.22), R, sz * (L / 2 - 0.55));
    const mm = miniMotor(0.2, 1.1, false);
    mm.g.rotation.y = sx > 0 ? 0 : Math.PI;
    mm.g.position.set(sx * 0.55, R, sz * (L / 2 - 0.55));
    const at = new THREE.Object3D();
    at.position.set(sx * (W / 2 + 0.22), R * 2 + 0.1, sz * (L / 2 - 0.55));
    g.add(spin, mm.g, at);
    wheels.push({ spin, at, sx, sz, hand });
  }
  if (top) {
    const hub = part('HUB', { scale: 0.42, pos: [0, 1.1, 0.25] });
    const batt = group(part('B_wrap', { scale: 0.26 }), part('B_label', { scale: 0.26 }));
    hub.position.set(0, 1.08, 0.75);
    batt.position.set(0, 1.2, -0.5);
    g.add(hub, batt);
  }
  // A volt-yellow arrow plate on the front so "forward" is never a guess.
  const nose = mesh(new THREE.ConeGeometry(0.3, 0.6, 3), plastic(C.volt, 0.4), [0, 0.95, -L / 2 + 0.05], [-Math.PI / 2, 0, 0]);
  nose.scale.z = 0.3;
  g.add(nose);
  g.scale.setScalar(k);
  return { g, wheels, L, W, R, nose };
}

// ---- A patch of FTC field: grey foam tiles with seams, and a low wall around it.
export function field(size = 18, tiles = 6, { wall = true } = {}) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#8D9391'; x.fillRect(0, 0, 128, 128);
  x.strokeStyle = '#767C7A'; x.lineWidth = 3; x.strokeRect(0, 0, 128, 128);
  x.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 60; i++) x.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(tiles, tiles); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const floor = mesh(new THREE.BoxGeometry(size, 0.16, size), [0, 0, 0, 0, 0, 0].map((_, i) => (i === 2 ? new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 }) : mat('#6C7270', { rough: 0.9 }))), [0, -0.08, 0]);
  const g = group(floor);
  if (wall) {
    const h = size / 2;
    for (const [w, d, px, pz] of [[size + 0.3, 0.15, 0, -h], [size + 0.3, 0.15, 0, h], [0.15, size, -h, 0], [0.15, size, h, 0]]) {
      g.add(box(w, 0.5, d, mat('#D9DDDC', { opacity: 0.35, rough: 0.2 }), { r: 0, pos: [px, 0.25, pz] }), box(w, 0.07, d + 0.02, metal('#2B2F30', 0.5), { r: 0, pos: [px, 0.52, pz] }));
    }
  }
  return g;
}

// ---- A gamepad. sticks[0] is the left stick: tilt it with setStick(i, x, y), x and y from -1 to 1.
export function gamepad(k = 1) {
  const shell = plastic('#2A2E30', 0.5, 0.4);
  const g = group(box(3.0, 0.62, 1.5, shell, { r: 0.28 }));
  for (const s of [-1, 1]) {
    const grip = box(0.95, 0.7, 1.9, shell, { r: 0.33, pos: [s * 1.25, -0.12, 0.62] });
    grip.rotation.y = s * -0.28; grip.rotation.x = 0.25;
    g.add(grip);
  }
  const sticks = [[-0.62, 0.42], [0.62, 0.42]].map(([x, z]) => {
    const st = group(cyl(0.09, 0.3, C.black, { pos: [0, 0.15, 0], seg: 12 }), cyl([0.24, 0.2], 0.1, mat('#16181A', { rough: 0.7 }), { pos: [0, 0.34, 0], seg: 24 }));
    st.position.set(x, 0.3, z);
    g.add(cyl(0.3, 0.06, mat('#16181A', { rough: 0.6 }), { pos: [x, 0.31, z], seg: 28 }), st);
    return st;
  });
  const cols = [C.volt, C.red, C.blue, C.green];
  [[0, -0.2], [0.2, 0], [-0.2, 0], [0, 0.2]].forEach(([dx, dz], i) => g.add(cyl(0.085, 0.1, plastic(cols[i], 0.4), { pos: [1.05 + dx, 0.34, -0.22 + dz], seg: 16 })));
  g.add(box(0.2, 0.08, 0.56, mat('#16181A', { rough: 0.6 }), { r: 0.03, pos: [-1.05, 0.33, -0.22] }), box(0.56, 0.08, 0.2, mat('#16181A', { rough: 0.6 }), { r: 0.03, pos: [-1.05, 0.33, -0.22] }));
  for (const s of [-1, 1]) g.add(box(0.7, 0.2, 0.3, mat('#16181A', { rough: 0.6 }), { r: 0.08, pos: [s * 1.0, 0.18, -0.72] }));
  const led = cyl(0.07, 0.05, mat(C.volt, { glow: true, glowPower: 1.2 }), { pos: [0, 0.32, -0.3], seg: 12 });
  g.add(led);
  g.scale.setScalar(k);
  return { g, sticks, led, setStick(i, x, y) { sticks[i].rotation.z = -x * 0.42; sticks[i].rotation.x = -y * 0.42; } };
}

// ---- A flat screen in the scene that a chapter draws on with ordinary 2D canvas calls. Call flush() after drawing.
export function screen(w, h, px = 720) {
  const c = document.createElement('canvas');
  c.width = px; c.height = Math.round((px * h) / w);
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const face = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), [0, 0, 0.07]);
  const g = group(box(w + 0.3, h + 0.3, 0.12, plastic('#1D2021', 0.4, 0.5), { r: 0.05 }), face);
  return { g, ctx, W: c.width, H: c.height, flush() { tex.needsUpdate = true; } };
}
// Graph helpers for a screen: clear with a title, map data to pixels, draw a line.
export function graph(scr, { title = '', x0 = 0, x1 = 1, y0 = 0, y1 = 1, xl = '', yl = '', pad = [70, 54, 26, 56] } = {}) {
  const { ctx, W, H } = scr, [pl, pt, pr, pb] = pad;
  const X = (v) => pl + ((v - x0) / (x1 - x0)) * (W - pl - pr), Y = (v) => H - pb - ((v - y0) / (y1 - y0)) * (H - pt - pb);
  ctx.fillStyle = '#1D2021'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#F4F4F0'; ctx.font = '600 26px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(title, pl, 36);
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1.5;
  ctx.strokeRect(pl, pt, W - pl - pr, H - pt - pb);
  ctx.fillStyle = 'rgba(244,244,240,0.7)'; ctx.font = '500 20px Inter, sans-serif';
  ctx.textAlign = 'center'; ctx.fillText(xl, (pl + W - pr) / 2, H - 14);
  ctx.save(); ctx.translate(22, (pt + H - pb) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(yl, 0, 0); ctx.restore();
  return {
    X, Y,
    grid(xs = [], ys = []) {
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.fillStyle = 'rgba(244,244,240,0.6)'; ctx.font = '500 18px Inter, sans-serif'; ctx.lineWidth = 1;
      for (const v of xs) { ctx.beginPath(); ctx.moveTo(X(v), pt); ctx.lineTo(X(v), H - pb); ctx.stroke(); ctx.textAlign = 'center'; ctx.fillText(String(v), X(v), H - pb + 20); }
      for (const v of ys) { ctx.beginPath(); ctx.moveTo(pl, Y(v)); ctx.lineTo(W - pr, Y(v)); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(String(v), pl - 8, Y(v) + 6); }
    },
    line(pts, color = C.volt, width = 4, dash = null) {
      if (pts.length < 2) return;
      ctx.save(); ctx.beginPath(); ctx.rect(pl, pt, W - pl - pr, H - pt - pb); ctx.clip();
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.setLineDash(dash || []);
      ctx.beginPath(); pts.forEach(([a, b], i) => ctx[i ? 'lineTo' : 'moveTo'](X(a), Y(b))); ctx.stroke(); ctx.restore();
    },
    dot(a, b, color = C.volt, r = 9) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(X(a), Y(b), r, 0, TAU); ctx.fill(); },
    text(s, a, b, color = '#F4F4F0', align = 'left') { ctx.fillStyle = color; ctx.font = '500 19px Inter, sans-serif'; ctx.textAlign = align; ctx.fillText(s, X(a), Y(b)); },
  };
}

// A flat arrow lying on the floor (or anywhere): set(len) stretches it, negative flips it. Points along -Z at rest.
export function flatArrow(color = C.volt, w = 0.22) {
  const m = mat(color, { glow: true, glowPower: 0.5 });
  const shaft = mesh(new THREE.BoxGeometry(w, 0.06, 1), m), head = mesh(new THREE.ConeGeometry(w * 1.5, w * 2.6, 3), m);
  head.rotation.x = -Math.PI / 2; head.scale.z = 0.25;
  const g = group(shaft, head);
  shaft.userData.noShadow = head.userData.noShadow = true;
  const hl = w * 2.6;
  g.set = (len) => {
    const a = Math.abs(len);
    g.visible = a > 0.04;
    const s = Math.sign(len) || 1, body = Math.max(0.01, a - hl * 0.6);
    shaft.scale.z = body; shaft.position.z = -s * body / 2;
    head.position.z = -s * (body + hl * 0.3); head.rotation.x = s > 0 ? -Math.PI / 2 : Math.PI / 2;
  };
  g.set(1);
  return g;
}

export const fmt = (v, d = 2) => (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d);
export const wrapDeg = (a) => ((((a + 180) % 360) + 360) % 360) - 180;
export { clamp };
